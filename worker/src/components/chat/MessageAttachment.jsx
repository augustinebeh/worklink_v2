import { FileTextIcon, DownloadIcon } from 'lucide-react';
import { clsx } from 'clsx';

export default function MessageAttachment({ attachment, isOwn }) {
  const isImage = attachment.type === 'image' || attachment.mime_type?.startsWith('image/');

  if (isImage) {
    return (
      <a href={attachment.url || attachment.file_url} target="_blank" rel="noopener noreferrer" className="block mb-2">
        <img
          src={attachment.thumbnail_url || attachment.url || attachment.file_url}
          alt={attachment.name || attachment.original_name || 'Image'}
          className="max-w-full rounded-lg max-h-48 object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={attachment.url || attachment.file_url}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx('flex items-center gap-2 p-2 rounded-lg mb-2', isOwn ? 'bg-white/10' : 'bg-white/5')}
    >
      <FileTextIcon className="h-5 w-5 flex-shrink-0" />
      <span className="flex-1 truncate text-sm">{attachment.name || attachment.original_name || 'Document'}</span>
      <DownloadIcon className="h-4 w-4 flex-shrink-0" />
    </a>
  );
}
