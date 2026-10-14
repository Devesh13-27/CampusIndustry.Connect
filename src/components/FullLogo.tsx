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
