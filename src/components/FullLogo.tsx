import Image from "next/image";

export default function FullLogo({
  className = "",
  size = "w-32 sm:w-40",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${size} ${className}`}
      role="img"
      aria-label="Bridge Careers"
    >
      <Image
        src="/brand/logo-full.png"
        alt=""
        width={1086}
        height={587}
        priority
        className="h-auto w-full"
      />
    </div>
  );
}
