export interface OpenGraphImage {
  image: string;
  "image:secure_url"?: string;
  "image:type"?: string;
  "image:width"?: number;
  "image:height"?: number;
  "image:alt"?: string;
}

export interface OpenGraphVideo {
  video: string;
  "video:secure_url"?: string;
  "video:type"?: string;
  "video:width"?: number;
  "video:height"?: number;
}

export interface OpenGraphAudio {
  audio: string;
  "audio:secure_url"?: string;
  "audio:type"?: string;
}

export interface OpenGraph {
  title?: string;
  type?: string;
  url?: string;
  description?: string;
  site_name?: string;
  determiner?: "a" | "an" | "the" | "auto" | "";
  locale?: string;
  "locale:alternate"?: string[];

  images?: OpenGraphImage[];
  videos?: OpenGraphVideo[];
  audios?: OpenGraphAudio[];
}
