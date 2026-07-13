
'use client';

import Image from 'next/image';

interface DevicePreviewProps {
    title: string;
    message: string;
    imageUrl?: string;
}

const IOSPreview = ({ title, message, imageUrl }: DevicePreviewProps) => (
    <div className="w-full max-w-sm mx-auto bg-black rounded-2xl shadow-lg p-2 font-sans">
        <div className="flex justify-between items-center text-xs text-white px-2">
             <span className="font-semibold">10:00</span>
             <div className="w-1/3 h-4 bg-black rounded-full"></div>
             <div className="flex items-center gap-1">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20"><path d="M10 1.5a.5.5 0 01.5.5v16a.5.5 0 01-1 0v-16a.5.5 0 01.5-.5zM5.5 5a.5.5 0 01.5.5v10a.5.5 0 01-1 0v-10A.5.5 0 015.5 5zm9 3a.5.5 0 00-1 0v4a.5.5 0 001 0V8z" /></svg>
                <span>5G</span>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.667 20C19.403 20 20 19.403 20 18.667V5.333C20 4.597 19.403 4 18.667 4H5.333C4.597 4 4 4.597 4 5.333v13.334C4 19.403 4.597 20 5.333 20h13.334zM22 8v8c0 .55-.45 1-1 1s-1-.45-1-1V8c0-.55.45-1 1-1s1 .45 1 1z"></path></svg>
            </div>
        </div>
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-lg p-3 mt-2 text-white">
            <div className="flex items-start gap-3">
                 <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    <span>R</span>
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">RER MedApps</span>
                        <span className="text-xs text-gray-400">now</span>
                    </div>
                    <p className="font-bold mt-1 truncate">{title || 'Notification Title'}</p>
                    <p className="text-sm text-gray-200 mt-0.5 line-clamp-2">{message || 'This is the notification message body.'}</p>
                </div>
            </div>
             {imageUrl && (
                 <div className="mt-3 rounded-lg overflow-hidden">
                    <Image src={imageUrl} alt="Notification" width={600} height={400} className="w-full object-cover" data-ai-hint="notification image" onError={(e) => { e.currentTarget.style.display = 'none'; }}/>
                </div>
            )}
        </div>
    </div>
);


export function DevicePreview({ title, message, imageUrl }: DevicePreviewProps) {
  return (
    <div className="flex justify-center">
      <IOSPreview title={title} message={message} imageUrl={imageUrl} />
    </div>
  );
}
