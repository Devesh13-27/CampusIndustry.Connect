import Image from "next/image";

export function LogoMark({ height = 36 }: { height?: number }) {
  return (
    <Image
      src="/brand/logo-icon.png"
      alt=""
      width={1007}
      height={391}
      priority
      className="w-auto shrink-0"
      style={{ height }}
    />
  );
}

export default function Logo({
  withText = true,
  textClassName = "",
  className = "",
}: {
  withText?: boolean;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark height={36} />
      {withText && (
        <span
          className={`text-base font-semibold tracking-tight text-slate-900 ${textClassName}`}
        >
          Bridge Careers
        </span>
      )}
    </span>
  );
}
