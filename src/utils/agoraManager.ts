'use client';

import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  ILocalVideoTrack,
  ILocalAudioTrack,
  IAgoraRTCRemoteUser,
} from 'agora-rtc-sdk-ng';

let AgoraRTCModule: any = null;

export async function getAgoraRTC() {
  if (!AgoraRTCModule && typeof window !== 'undefined') {
    const imported = await import('agora-rtc-sdk-ng');
    AgoraRTCModule = imported.default || imported;
    try {
      AgoraRTCModule.setLogLevel(1); // Warnings & errors only
    } catch {}
  }
  return AgoraRTCModule;
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  userAccount: string;
  expiresAt: number;
}

export async function fetchAgoraToken(channelName: string, userId: string, role = 'publisher'): Promise<AgoraTokenResponse> {
  const configuredBackendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  const urlsToTry: string[] = [
    `${configuredBackendUrl}/agora/token?channelName=${encodeURIComponent(channelName)}&userId=${encodeURIComponent(userId)}&role=${role}`,
  ];

  // If the configured URL is a remote URL (e.g. onrender.com) that hasn't been deployed yet, fallback to localhost:5000
  if (!configuredBackendUrl.includes('localhost:5000') && !configuredBackendUrl.includes('127.0.0.1:5000')) {
    urlsToTry.push(`http://localhost:5000/agora/token?channelName=${encodeURIComponent(channelName)}&userId=${encodeURIComponent(userId)}&role=${role}`);
  }

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return await res.json();
      }
      console.warn(`[Agora] Token request to ${url} returned status ${res.status}`);
    } catch (err) {
      console.warn(`[Agora] Token request to ${url} failed:`, err);
    }
  }

  console.error('[Agora] All token endpoints failed. Please make sure the backend is running and deployed.');
  const fallbackAppId = process.env.NEXT_PUBLIC_AGORA_APP_ID || '86633dad29ae45f1b6b3fdfe088db8ca';
  return {
    token: '',
    appId: fallbackAppId,
    channelName,
    userAccount: userId,
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
  };
}

export class AgoraCallManager {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;
  private screenTrack: ILocalVideoTrack | null = null;

  private onRemoteStreamUpdate: ((userId: string, stream: MediaStream | null) => void) | null = null;
  private onUserJoined: ((userId: string) => void) | null = null;
  private onUserLeft: ((userId: string) => void) | null = null;

  constructor() {}

  setCallbacks(callbacks: {
    onRemoteStreamUpdate?: (userId: string, stream: MediaStream | null) => void;
    onUserJoined?: (userId: string) => void;
    onUserLeft?: (userId: string) => void;
  }) {
    this.onRemoteStreamUpdate = callbacks.onRemoteStreamUpdate || null;
    this.onUserJoined = callbacks.onUserJoined || null;
    this.onUserLeft = callbacks.onUserLeft || null;
  }

  async joinChannel(options: {
    channelName: string;
    userId: string;
    type: 'AUDIO' | 'VIDEO';
  }): Promise<{
    localStream: MediaStream;
    localAudioTrack: IMicrophoneAudioTrack;
    localVideoTrack: ICameraVideoTrack | null;
  }> {
    const AgoraRTC = await getAgoraRTC();
    if (!AgoraRTC) {
      throw new Error('AgoraRTC SDK is not available in server environment.');
    }

    const client = this.client || AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.client = client;

    const { channelName, userId, type } = options;

    // 1. Fetch Token from NestJS backend
    const tokenData = await fetchAgoraToken(channelName, userId, 'publisher');
    const appId = tokenData.appId || process.env.NEXT_PUBLIC_AGORA_APP_ID || '86633dad29ae45f1b6b3fdfe088db8ca';

    // 2. Set up remote track listeners
    client.on('user-published', async (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      await client.subscribe(user, mediaType);

      const remoteUid = String(user.uid);
      const mediaTracks: MediaStreamTrack[] = [];

      if (user.videoTrack) {
        const vt = user.videoTrack.getMediaStreamTrack();
        if (vt) mediaTracks.push(vt);
      }
      if (user.audioTrack) {
        const at = user.audioTrack.getMediaStreamTrack();
        if (at) mediaTracks.push(at);
        // Play remote audio automatically
        try {
          user.audioTrack.play();
        } catch (e) {
          console.warn('[Agora] Remote audio auto-play:', e);
        }
      }

      if (mediaTracks.length > 0) {
        const stream = new MediaStream(mediaTracks);
        this.onRemoteStreamUpdate?.(remoteUid, stream);
      }
    });

    client.on('user-unpublished', (user: IAgoraRTCRemoteUser, mediaType: 'audio' | 'video') => {
      const remoteUid = String(user.uid);
      const mediaTracks: MediaStreamTrack[] = [];

      if (mediaType === 'video' && user.audioTrack) {
        const at = user.audioTrack.getMediaStreamTrack();
        if (at) mediaTracks.push(at);
      } else if (mediaType === 'audio' && user.videoTrack) {
        const vt = user.videoTrack.getMediaStreamTrack();
        if (vt) mediaTracks.push(vt);
      }

      if (mediaTracks.length > 0) {
        this.onRemoteStreamUpdate?.(remoteUid, new MediaStream(mediaTracks));
      } else if (!user.videoTrack && !user.audioTrack) {
        this.onRemoteStreamUpdate?.(remoteUid, null);
      }
    });

    client.on('user-joined', (user: IAgoraRTCRemoteUser) => {
      this.onUserJoined?.(String(user.uid));
    });

    client.on('user-left', (user: IAgoraRTCRemoteUser) => {
      const remoteUid = String(user.uid);
      this.onRemoteStreamUpdate?.(remoteUid, null);
      this.onUserLeft?.(remoteUid);
    });

    // 3. Join Channel
    await client.join(appId, channelName, tokenData.token || null, userId);

    // 4. Create Local Media Tracks
    const localAudioTrack: IMicrophoneAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: 'speech_standard',
      AEC: true,
      ANS: true,
      AGC: true,
    });
    this.localAudioTrack = localAudioTrack;

    const localTracks: (IMicrophoneAudioTrack | ICameraVideoTrack)[] = [localAudioTrack];
    const nativeTracks: MediaStreamTrack[] = [localAudioTrack.getMediaStreamTrack()];

    if (type === 'VIDEO') {
      try {
        this.localVideoTrack = await AgoraRTC.createCameraVideoTrack({
          encoderConfig: {
            width: { ideal: 640, max: 1280 },
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 },
          },
        });
        if (this.localVideoTrack) {
          localTracks.push(this.localVideoTrack);
          nativeTracks.push(this.localVideoTrack.getMediaStreamTrack());
        }
      } catch (err) {
        console.warn('[Agora] Camera access failed, continuing audio-only:', err);
      }
    }

    // 5. Publish Local Tracks to Channel
    await client.publish(localTracks);

    const localStream = new MediaStream(nativeTracks);

    return {
      localStream,
      localAudioTrack: this.localAudioTrack,
      localVideoTrack: this.localVideoTrack,
    };
  }

  async setAudioMuted(muted: boolean) {
    if (this.localAudioTrack) {
      await this.localAudioTrack.setEnabled(!muted);
    }
  }

  async setVideoMuted(muted: boolean) {
    if (this.localVideoTrack) {
      await this.localVideoTrack.setEnabled(!muted);
    }
  }

  async startScreenShare(): Promise<MediaStreamTrack | null> {
    if (!this.client) return null;

    try {
      const AgoraRTC = await getAgoraRTC();
      if (!AgoraRTC) return null;

      const screenTrackResult = await AgoraRTC.createScreenVideoTrack(
        {
          encoderConfig: '720p_2',
        },
        'disable'
      );

      const screenTrack = Array.isArray(screenTrackResult) ? screenTrackResult[0] : screenTrackResult;
      this.screenTrack = screenTrack;

      if (this.localVideoTrack) {
        await this.client.unpublish(this.localVideoTrack);
      }
      if (this.screenTrack) {
        await this.client.publish(this.screenTrack);
      }

      if (!this.screenTrack) return null;
      const nativeTrack = this.screenTrack.getMediaStreamTrack();
      nativeTrack.onended = () => {
        this.stopScreenShare();
      };

      return nativeTrack;
    } catch (err) {
      console.error('[Agora] Screen share failed:', err);
      return null;
    }
  }

  async stopScreenShare() {
    if (!this.client) return;

    if (this.screenTrack) {
      await this.client.unpublish(this.screenTrack);
      this.screenTrack.close();
      this.screenTrack = null;
    }

    if (this.localVideoTrack) {
      await this.client.publish(this.localVideoTrack);
    }
  }

  async leaveChannel() {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }

      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      if (this.screenTrack) {
        this.screenTrack.stop();
        this.screenTrack.close();
        this.screenTrack = null;
      }

      if (this.client) {
        this.client.removeAllListeners();
        await this.client.leave();
      }
    } catch (err) {
      console.warn('[Agora] Error during channel leave:', err);
    }
  }
}
