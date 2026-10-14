import Image from "next/image";

export default function FullLogo({
  className = "",
  size = "w-56 sm:w-80",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${size} ${className}`}
      role="img"
      aria-label="CampusIndustry.Connect"
    >
      <Image
        src="/brand/logo-full.png"
        alt=""
        width={372}
        height={378}
        priority
        className="h-auto w-full"
      />
    </div>
  );
}
