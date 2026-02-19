export default function NotFound() {
  return (
    <>
      <main className="h-full bg-white shadow-none max-h-svh max-w-5xls">
        <div className="flex flex-col items-center justify-center h-fullr">
          <div className="flex flex-col items-center mt-10">
            <p className="text-base font-semibold text-primary">404</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              존재하지 않는 페이지
            </h1>
            <p className="mt-6 text-base leading-7 text-gray-600">
              미안해요, 해당 페이지를 찾을 수 없어요.
            </p>
            <div className="flex items-center justify-center mt-4">
              <a
                href="/"
                className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                홈으로
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
