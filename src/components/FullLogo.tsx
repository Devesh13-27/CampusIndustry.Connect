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
        width={768}
        height={512}
        priority
        className="h-auto w-full"
      />
    </div>
  );
}
