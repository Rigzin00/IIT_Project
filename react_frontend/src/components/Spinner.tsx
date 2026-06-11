export default function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <div
      className={`rounded-full border-2 border-[#E5E7EB] border-t-[#C41212] animate-spin ${
        size === 'lg' ? 'w-8 h-8' : 'w-4 h-4'
      }`}
    />
  );
}
