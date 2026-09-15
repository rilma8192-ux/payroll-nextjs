"use client";

import { useRef, useState } from "react";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { downloadSampleExcel } from "@/lib/payroll/excel";

interface Props {
  onFileSelected: (file: File) => void;
  fileName: string | null;
  columnCount: number | null;
  employeeCount: number | null;
  error: string | null;
  loading: boolean;
}

export default function PayrollUpload({ onFileSelected, fileName, columnCount, employeeCount, error, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-800">1. 급여 입력자료 업로드</h2>

      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`flex-1 cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-orange-500 bg-orange-50" : "border-slate-300 hover:border-orange-400"
          }`}
        >
          <UploadCloud className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <div className="text-sm text-slate-700">Excel 파일(.xlsx)을 클릭하거나 끌어다 놓으세요.</div>
          <div className="mt-1 text-xs text-slate-400">.xlsx 형식만 지원</div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>

        <button
          type="button"
          onClick={downloadSampleExcel}
          className="flex shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          샘플 Excel 다운로드
        </button>
      </div>

      {loading && <div className="mt-4 text-sm text-slate-500">파일을 읽는 중입니다...</div>}

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && fileName && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <FileSpreadsheet className="h-4 w-4 text-orange-500" />
            {fileName}
          </span>
          <span>인식 직원 수: <b>{employeeCount}명</b></span>
          <span>컬럼 수: <b>{columnCount}개</b></span>
        </div>
      )}

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        발표용 프로토타입으로 모든 예시 데이터는 가상 데이터입니다. 업로드된 원본 Excel 파일은
        브라우저에서 처리되며 별도로 저장하지 않습니다.
      </p>
    </section>
  );
}
