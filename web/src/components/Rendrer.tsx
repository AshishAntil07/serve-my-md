import { useNavigate } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

export default function Rendrer({
  path,
  content,
  next,
  prev,
  title
}: {
  path: string
  content: string
  next?: string
  prev?: string
  title: string
}) {
  const articleRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if(!articleRef.current) return;

    const article = articleRef.current;
    article.querySelectorAll("a").forEach((elem: HTMLAnchorElement, i) => {
      elem.addEventListener('click', (e) => {
        e.preventDefault();
        navigate({ to: elem.getAttribute('href') || '/' });
      });
    });
  }, [articleRef.current]);

  return (
    <>
      <main>
        {/* breadcrumb */}
        <article ref={articleRef} className='main-article' dangerouslySetInnerHTML={{__html: content}} />

        {/* next prev buttons */}
      </main>
    </>
  )
}
