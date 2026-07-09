"use client";
import { useState, useRef, useMemo, useEffect } from "react";
import { signOut } from "next-auth/react";
import { ToastContainer, toast } from "react-toastify";
import Footer from "@/components/Footer";
import Link from "next/link";
import UploadPanel from "@/components/UploadPanel";
import ResultLinks from "@/components/ResultLinks";

const LoginButton = ({ onClick, children }) => (
  <button
    onClick={onClick}
    className="px-5 py-2 rounded-xl text-sm font-semibold bg-teal-600 text-white shadow-[0_4px_14px_rgb(13_148_136/0.25)] hover:bg-teal-700"
  >
    {children}
  </button>
);

const UA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
};

function isPdfFile(file) {
  const t = (file.type || "").toLowerCase();
  return (
    t === "application/pdf" ||
    t === "application/x-pdf" ||
    /\.pdf$/i.test(file.name || "")
  );
}

function isEpubFile(file) {
  const t = (file.type || "").toLowerCase();
  return (
    t === "application/epub+zip" ||
    t === "application/epub" ||
    /\.epub$/i.test(file.name || "")
  );
}

function isOfficeFile(file) {
  return /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(file.name || "");
}

function isAudioFile(file) {
  return (file.type || "").startsWith("audio/") || /\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(file.name || "");
}

/**
 * 需要进 Telegram 频道的类型：音频/PDF/办公文档/EPUB。
 * 默认接口是 R2（只存桶、不发 TG）；这些类型自动切到 TG_Channel。
 */
function needsTgChannel(files) {
  return files.some(
    (f) => isPdfFile(f) || isAudioFile(f) || isEpubFile(f) || isOfficeFile(f)
  );
}

/**
 * 首页交互层。total / ip / 登录态由 Server Component 注入，不再首屏串行 3 个 API。
 */
export default function HomeClient({
  initialTotal = "?",
  initialIp = "",
  initialRole = "",
  initialIsAuth = false,
}) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadedFilesNum, setUploadedFilesNum] = useState(0);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState("preview");
  const [uploading, setUploading] = useState(false);
  const [IP] = useState(initialIp);
  const [Total, setTotal] = useState(initialTotal);
  const [selectedOption, setSelectedOption] = useState("r2");
  const [isAuthapi] = useState(initialIsAuth);
  const [Loginuser] = useState(initialRole);
  const [boxType, setBoxtype] = useState("img");

  const fileInputRef = useRef(null);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    const filteredFiles = incoming.filter(
      (file) => !selectedFiles.find((selFile) => selFile.name === file.name)
    );
    const uniqueFiles = filteredFiles.filter(
      (file) => !uploadedImages.find((upImg) => upImg.name === file.name)
    );
    if (uniqueFiles.length === 0) return;

    if (needsTgChannel(uniqueFiles) && selectedOption !== "tgchannel") {
      if (!isAuthapi) {
        toast.error("该类型需登录后使用 TG_Channel 上传（会发到频道）");
      } else {
        setSelectedOption("tgchannel");
        toast.info("已切换到 TG_Channel（文件将发到 Telegram 频道）");
      }
    }

    setSelectedFiles((prev) => [...prev, ...uniqueFiles]);
  };

  const handleFileChange = (event) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleClear = () => {
    setSelectedFiles([]);
  };

  const getTotalSizeInMB = (files) => {
    const totalSizeInBytes = Array.from(files).reduce(
      (acc, file) => acc + file.size,
      0
    );
    return (totalSizeInBytes / (1024 * 1024)).toFixed(2);
  };

  const handleUpload = async (file = null) => {
    setUploading(true);
    const filesToUpload = file ? [file] : selectedFiles;

    if (filesToUpload.length === 0) {
      toast.error("请选择要上传的文件");
      setUploading(false);
      return;
    }

    const formFieldName = selectedOption === "tencent" ? "media" : "file";
    let successCount = 0;

    try {
      for (const f of filesToUpload) {
        const formData = new FormData();
        formData.append(formFieldName, f);

        try {
          const targetUrl =
            selectedOption === "tgchannel" || selectedOption === "r2"
              ? `/api/enableauthapi/${selectedOption}`
              : `/api/${selectedOption}`;

          const response = await fetch(targetUrl, {
            method: "POST",
            body: formData,
            headers: UA_HEADERS,
          });

          if (response.ok) {
            const result = await response.json();
            f.url = result.url;
            setUploadedImages((prevImages) => [...prevImages, f]);
            setSelectedFiles((prevFiles) => prevFiles.filter((x) => x !== f));
            successCount++;
          } else {
            let errorMsg;
            try {
              const errorData = await response.json();
              errorMsg = errorData.message || `上传 ${f.name} 图片时出错`;
            } catch {
              errorMsg = `上传 ${f.name} 图片时发生未知错误`;
            }

            switch (response.status) {
              case 400:
                toast.error(`请求无效: ${errorMsg}`);
                break;
              case 403:
                toast.error(`无权限访问资源: ${errorMsg}`);
                break;
              case 404:
                toast.error(`资源未找到: ${errorMsg}`);
                break;
              case 500:
                toast.error(`服务器错误: ${errorMsg}`);
                break;
              case 401:
                toast.error(`未授权: ${errorMsg}`);
                break;
              default:
                toast.error(`上传 ${f.name} 图片时出错: ${errorMsg}`);
            }
          }
        } catch {
          toast.error(`上传 ${f.name} 图片时出错`);
        }
      }

      setUploadedFilesNum(uploadedFilesNum + successCount);
      if (successCount > 0) {
        setTotal((prev) => {
          const n = Number(prev);
          return Number.isFinite(n) ? n + successCount : prev;
        });
      }
      toast.success(`已成功上传 ${successCount} 张图片`);
    } catch (error) {
      console.error("上传过程中出现错误:", error);
      toast.error("上传错误");
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (event) => {
    const clipboardItems = event.clipboardData.items;
    for (let i = 0; i < clipboardItems.length; i++) {
      const item = clipboardItems[i];
      if (item.kind === "file" && item.type.includes("image")) {
        const file = item.getAsFile();
        setSelectedFiles((prev) => [...prev, file]);
        break;
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    addFiles(event.dataTransfer.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const calculateMinHeight = () => {
    const rows = Math.ceil(selectedFiles.length / 4);
    return `${Math.max(rows, 1) * 100}px`;
  };

  const filePreviews = useMemo(
    () => selectedFiles.map((f) => URL.createObjectURL(f)),
    [selectedFiles]
  );
  useEffect(() => {
    return () => filePreviews.forEach((u) => URL.revokeObjectURL(u));
  }, [filePreviews]);

  const handleImageClick = (index) => {
    const file = selectedFiles[index];
    const t = file.type || "";
    if (t.startsWith("image/")) {
      setBoxtype("img");
    } else if (t.startsWith("video/")) {
      setBoxtype("video");
    } else if (isAudioFile(file)) {
      setBoxtype("audio");
    } else if (isPdfFile(file)) {
      setBoxtype("pdf");
    } else if (isEpubFile(file) || isOfficeFile(file)) {
      setBoxtype("doc");
    } else {
      setBoxtype("other");
    }
    setSelectedImage(URL.createObjectURL(file));
  };

  const handleCloseImage = () => {
    if (selectedImage && selectedImage.startsWith("blob:")) {
      URL.revokeObjectURL(selectedImage);
    }
    setSelectedImage(null);
  };

  const handleRemoveImage = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlerenderImageClick = (imageUrl, type) => {
    setBoxtype(type);
    setSelectedImage(imageUrl);
  };

  const handleSelectChange = (e) => {
    setSelectedOption(e.target.value);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const renderButton = () => {
    if (!isAuthapi) {
      return (
        <Link href="/login">
          <LoginButton>登录</LoginButton>
        </Link>
      );
    }
    switch (Loginuser) {
      case "user":
        return <LoginButton onClick={handleSignOut}>登出</LoginButton>;
      case "admin":
        return (
          <Link href="/admin">
            <LoginButton>管理</LoginButton>
          </Link>
        );
      default:
        return (
          <Link href="/login">
            <LoginButton>登录</LoginButton>
          </Link>
        );
    }
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* 顶栏：融入内容流，不固定吃屏幕 */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 border-b border-slate-200/60">
        <nav className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold shadow-[0_2px_8px_rgb(13_148_136/0.3)]">
              N
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-900">
              Namoo Pix
            </span>
          </div>
          {renderButton()}
        </nav>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 w-full max-w-2xl mx-auto px-5 py-10">
        <UploadPanel
          total={Total}
          ip={IP}
          selectedOption={selectedOption}
          onSelectChange={handleSelectChange}
          isAuth={isAuthapi}
          selectedFiles={selectedFiles}
          filePreviews={filePreviews}
          uploading={uploading}
          minHeight={calculateMinHeight()}
          totalSizeMB={getTotalSizeInMB(selectedFiles)}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onPaste={handlePaste}
          onImageClick={handleImageClick}
          onRemoveImage={handleRemoveImage}
          onUploadOne={(f) => handleUpload(f)}
          onClear={handleClear}
          onUploadAll={() => handleUpload()}
        />

        <ToastContainer />

        <ResultLinks
          uploadedImages={uploadedImages}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPreviewClick={handlerenderImageClick}
        />
      </div>

      {/* 预览弹层 */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={handleCloseImage}
        >
          <div className="relative flex flex-col items-center max-w-4xl max-h-[90vh]">
            <button
              type="button"
              className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl backdrop-blur-md"
              onClick={handleCloseImage}
              aria-label="关闭预览"
            >
              &times;
            </button>

            {boxType === "img" ? (
              <img
                src={selectedImage}
                alt="预览"
                className="object-contain max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
              />
            ) : boxType === "video" ? (
              <video
                src={selectedImage}
                className="object-contain max-w-full max-h-[85vh] rounded-2xl shadow-2xl"
                controls
              />
            ) : boxType === "audio" ? (
              <div className="p-8 bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <audio src={selectedImage} controls className="w-80 max-w-full" />
              </div>
            ) : boxType === "pdf" ? (
              <div className="p-8 bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 font-semibold underline"
                >
                  在新标签打开 PDF
                </a>
              </div>
            ) : boxType === "doc" ? (
              <div className="p-8 bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <a
                  href={selectedImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="text-teal-600 font-semibold underline"
                >
                  下载文档
                </a>
              </div>
            ) : boxType === "other" ? (
              <div className="p-8 bg-white rounded-2xl shadow-2xl text-slate-900">
                <p>不支持预览此文件类型</p>
              </div>
            ) : (
              <div className="text-white">未知类型</div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
