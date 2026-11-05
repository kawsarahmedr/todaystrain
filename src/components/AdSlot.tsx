/**
 * Reserved advertising space. Renders NOTHING unless NEXT_PUBLIC_ADS_ENABLED=true,
 * so pages ship without any ad code until AdSense is approved and enabled.
 * When enabled, the box has a fixed height so ad loading cannot shift layout.
 * Placement rule: never directly next to navigation, forms or buttons.
 */
export function AdSlot({
  id,
  height = 280,
  className = '',
}: {
  id: string;
  height?: number;
  className?: string;
}) {
  if (process.env.NEXT_PUBLIC_ADS_ENABLED !== 'true') return null;
  return (
    <aside
      aria-label="বিজ্ঞাপন"
      data-ad-slot={id}
      className={`my-8 flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-500 ${className}`}
      style={{ height }}
    >
      বিজ্ঞাপন
    </aside>
  );
}
