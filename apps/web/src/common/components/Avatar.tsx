export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
  xl: "w-16 h-16 text-lg"
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  const first = parts[0]![0]!;
  const last = parts[parts.length - 1]![0]!;
  return (first + last).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    "bg-brand-500",
    "bg-blue-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-cyan-500",
    "bg-violet-500"
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex] ?? colors[0]!;
}

export function Avatar({ src, alt, name, size = "md", className = "" }: AvatarProps) {
  const displayName = name ?? "";
  const initials = getInitials(displayName);
  const bgColor = getColorFromName(displayName);

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? displayName}
        className={`rounded-full object-cover ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-medium ${sizeClasses[size]} ${bgColor} ${className}`}
    >
      {initials}
    </div>
  );
}
