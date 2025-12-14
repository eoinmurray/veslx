

export function FigureSlide({
  title,
  src,
}: {
  title: string;
  src: string;
}) {
  return (
    <div className="figure-slide">
      <h2>{title}</h2>
      <img src={src} alt={title} />
    </div>
  );
}