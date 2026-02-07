export default function QuickReplyChip({ text, onClick }) {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-4 py-2 rounded-xl bg-[#0a1628] border border-white/[0.08] text-sm text-white/70 hover:bg-white/5 hover:text-white transition-all whitespace-nowrap"
    >
      {text}
    </button>
  );
}
