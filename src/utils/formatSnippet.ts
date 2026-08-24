/**
 * Formats a message content or attachment for clean sidebar previews,
 * reply banners, and notifications.
 */
export function formatMessageSnippet(msg: any): string {
  if (!msg) return 'No messages yet';
  if (msg.attachments && msg.attachments.length > 0) {
    const isImage = msg.attachments.some((a: any) => 
      a.type?.startsWith('image/') || 
      (typeof a.url === 'string' && a.url.match(/\.(png|jpg|jpeg|gif|webp)$/i))
    );
    if (isImage) return '📷 Photo';
    return '📎 Attachment';
  }
  if (msg.fileUrl) {
    if (msg.fileType === 'IMAGE' || (typeof msg.fileUrl === 'string' && msg.fileUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i))) {
      return '📷 Photo';
    }
    return '📎 Attachment';
  }
  let text = (msg.content || '').trim();
  if (!text) return 'Sent a file';

  // Strip [BIG_EMOJI:size]
  if (text.startsWith('[BIG_EMOJI:')) {
    const closingIdx = text.indexOf(']');
    if (closingIdx !== -1) {
      text = text.slice(closingIdx + 1).trim();
    }
  }

  // Strip HTML if rich formatted email
  if (text.includes('<') && text.includes('>')) {
    const stripped = text.replace(/<[^>]*>/g, '').trim();
    if (stripped) text = stripped;
  }

  return text;
}
