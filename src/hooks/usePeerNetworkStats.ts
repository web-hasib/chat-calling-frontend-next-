import { useEffect, useState } from 'react';

export type NetworkQuality = 'good' | 'fair' | 'poor' | 'unknown';

export interface PeerNetworkStats {
  quality: NetworkQuality;
  rtt?: number; // ms
  packetLossPercent?: number;
}

/**
 * usePeerNetworkStats periodically polls RTCPeerConnection stats to calculate RTT & packet loss.
 */
export function usePeerNetworkStats(peerConnection: RTCPeerConnection | null): PeerNetworkStats {
  const [stats, setStats] = useState<PeerNetworkStats>({ quality: 'unknown' });

  useEffect(() => {
    if (!peerConnection) {
      setStats({ quality: 'unknown' });
      return;
    }

    let prevPacketsLost = 0;
    let prevPacketsReceived = 0;

    const interval = setInterval(async () => {
      try {
        if (peerConnection.connectionState === 'closed' || peerConnection.signalingState === 'closed') {
          return;
        }

        const report = await peerConnection.getStats();
        let rtt: number | undefined;
        let packetsLostDelta = 0;
        let packetsReceivedDelta = 0;

        report.forEach((stat) => {
          if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
            if (typeof stat.currentRoundTripTime === 'number') {
              rtt = Math.round(stat.currentRoundTripTime * 1000);
            }
          }

          if (stat.type === 'inbound-rtp' && (stat.kind === 'video' || stat.kind === 'audio')) {
            const packetsLost = stat.packetsLost || 0;
            const packetsReceived = stat.packetsReceived || 0;

            if (prevPacketsReceived > 0) {
              packetsLostDelta = Math.max(0, packetsLost - prevPacketsLost);
              packetsReceivedDelta = Math.max(1, packetsReceived - prevPacketsReceived);
            }

            prevPacketsLost = packetsLost;
            prevPacketsReceived = packetsReceived;
          }
        });

        let lossRate = 0;
        if (packetsReceivedDelta + packetsLostDelta > 0) {
          lossRate = (packetsLostDelta / (packetsReceivedDelta + packetsLostDelta)) * 100;
        }

        let quality: NetworkQuality = 'good';
        if ((rtt && rtt > 300) || lossRate > 5) {
          quality = 'poor';
        } else if ((rtt && rtt > 150) || lossRate > 2) {
          quality = 'fair';
        } else if (rtt !== undefined) {
          quality = 'good';
        }

        setStats({
          quality,
          rtt,
          packetLossPercent: Math.round(lossRate),
        });
      } catch {
        // Silently catch stats polling errors
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [peerConnection]);

  return stats;
}
