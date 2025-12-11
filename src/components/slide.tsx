

export function Slide({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen bg-red-500 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full h-full">
        {children}
      </div>
    </div>
  )
}