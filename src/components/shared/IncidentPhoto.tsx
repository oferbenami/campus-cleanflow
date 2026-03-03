import { useState, useEffect } from "react";
import { getIncidentPhotoUrl } from "@/lib/storage-utils";

interface IncidentPhotoProps {
  photoPath: string | null;
  className?: string;
  alt?: string;
}

const IncidentPhoto = ({ photoPath, className = "rounded-lg max-h-40 object-cover w-full", alt = "תמונה" }: IncidentPhotoProps) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath) { setUrl(null); return; }
    getIncidentPhotoUrl(photoPath).then(setUrl);
  }, [photoPath]);

  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
};

export default IncidentPhoto;
