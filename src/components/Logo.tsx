import Image from "next/image";

export function LogoMark({ height = 36 }: { height?: number }) {
  return (
    <Image
      src="/brand/logo-full.png"
      alt="CampusIndustry.Connect"
      width={768}
      height={512}
      priority
      className="w-auto shrink-0 object-contain"
      style={{ height }}
    />
  );
}

export default function Logo({
  className = "",
}: {
  withText?: boolean;
  textClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <LogoMark height={52} />
    </span>
  );
}
