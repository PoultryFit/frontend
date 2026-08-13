export function ModuleHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-6">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}