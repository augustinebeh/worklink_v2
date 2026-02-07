export default function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-[#0a1628] px-4 py-3 rounded-2xl rounded-bl-md border border-white/[0.05]">
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
