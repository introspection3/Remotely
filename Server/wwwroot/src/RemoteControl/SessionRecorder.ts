﻿import { GetCurrentViewer } from "./UI.js";

export class SessionRecorder {
    private Recorder: any;
    private Stream: MediaStream;
    private RecordedData: Array<any> = [];

    Start() {
        if (!window["MediaRecorder"] || !(GetCurrentViewer() as any).captureStream) {
            alert("当前浏览器不支持会话录制.");
            return;
        }

        if (this.Recorder && this.Recorder.state != "inactive") {
            this.Recorder.stop();
        }

        this.RecordedData = [];
        this.Stream = (GetCurrentViewer() as any).captureStream(10);
        var options = { mimeType: 'video/webm' };
        this.Recorder = new window["MediaRecorder"](this.Stream, options);
        this.Recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                this.RecordedData.push(event.data);
            }
        }
        this.Recorder.start(100);
    }

    Stop() {
        if (!this.Recorder) {
            return;
        }

        this.Recorder.stop();
    }

    DownloadVideo() {
        if (!this.RecordedData || this.RecordedData.length == 0) {
            alert("没有录制视频.");
            return;
        }

        if (this.Recorder && this.Recorder.state != "inactive") {
            alert("需要先停止录制才能下载");
            return;
        }
        var currentDate = new Date();
        var dateString = `${currentDate.getFullYear()}-` +
            `${(currentDate.getMonth() + 1).toString().padStart(2, "0")}-` +
            `${currentDate.getDate().toString().padStart(2, "0")} ` + 
            `${currentDate.getHours().toString().padStart(2, "0")}.` +
            `${currentDate.getMinutes().toString().padStart(2, "0")}.` +
            `${currentDate.getSeconds().toString().padStart(2, "0")}`;

        var blob = new Blob(this.RecordedData, { type: 'video/webm' });
        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.download = `Remote_Session_${dateString}.webm`;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}