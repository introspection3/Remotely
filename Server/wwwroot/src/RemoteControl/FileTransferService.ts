﻿import { FileTransferProgress, FileTransferInput, FileTransferNameSpan } from "./UI.js";
import { ViewerApp } from "./App.js";
import { ShowMessage } from "./UI.js";
import { FileDto } from "./Interfaces/Dtos.js";

const PartialDownloads: Record<string, Array<Uint8Array>> = {};

export async function UploadFiles(fileList: FileList) {
    if (!FileTransferProgress.parentElement.hasAttribute("hidden")) {
        FileTransferInput.value = null;
        ShowMessage("文件传输正在进行...");
        return;
    }
    ShowMessage("文件上传已开始...");
    FileTransferProgress.value = 0;
    FileTransferProgress.parentElement.removeAttribute("hidden");

    try {
        for (var i = 0; i < fileList.length; i++) {
            FileTransferNameSpan.innerHTML = fileList[i].name;
            var buffer = await fileList[i].arrayBuffer();
            await ViewerApp.MessageSender.SendFile(new Uint8Array(buffer), fileList[i].name);
        }
        ShowMessage("文件上传已完成.");
    }
    catch {
        ShowMessage("文件上传失败.");
    }
    FileTransferInput.value = null;
    FileTransferProgress.parentElement.setAttribute("hidden", "hidden");
}

export async function ReceiveFile(file: FileDto) {
    if (file.StartOfFile) {
        ShowMessage(`下载文件 ${file.FileName}...`);
    }

    var partial = PartialDownloads[file.MessageId];
    if (!partial) {
        partial = new Array<Uint8Array>();
        PartialDownloads[file.MessageId] = partial;
    }

    if (file.Buffer) {
        partial.push(file.Buffer);
    }

    if (file.EndOfFile) {
        var blob = new Blob(partial, { type: 'application/octet-stream' });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = file.FileName;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}