import { SpinningText } from "./magicui/spinning-text";

export function Loading({ text, icon }) {
  return (
    <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center z-[1800]">
      <div className="absolute inset-0 z-50 w-full h-full"></div>
      {text && !icon && <p className="text-primary">{text}</p>}
      {!text && icon && (
        <progress className="w-56 progress progress-primary"></progress>
      )}
      {!text && !icon && (
        <SpinningText className="font-bold text-primary">
          또 박 한 글 • 또 박 한 글 • 또 박 한 글 •
        </SpinningText>
      )}
    </div>
  );
}
