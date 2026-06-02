export default function Spinner({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return <div className={size === 'lg' ? 'spinner spinner-lg' : 'spinner'} />;
}
