import { useEffect } from "react"
import output from '@/output.json' with { type: 'json' };


export default function Fonts() {
  useEffect(() => {
    document.documentElement.style.setProperty('--font-out-body', output.fonts.body);
    document.documentElement.style.setProperty('--font-out-code', 'consolas');
    document.documentElement.style.setProperty('--font-out-heading', output.fonts.title);
  }, []);

  return null;
}