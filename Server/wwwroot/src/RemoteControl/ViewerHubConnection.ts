import * as UI from "./UI.js";
import { ViewerApp } from "./App.js";
import { CursorInfo } from "./Models/CursorInfo.js";
import { IceServerModel } from "./Models/IceServerModel.js";
import { RemoteControlMode } from "./Enums/RemoteControlMode.js";
import { GenericDto } from "./Interfaces/Dtos.js";
import { ShowMessage } from "./UI.js";
import { BaseDto } from "./Interfaces/BaseDto.js";
import { WindowsSession } from "./Models/WindowsSession.js";
import { BaseDtoType } from "./Enums/BaseDtoType.js";
import { HubConnection } from "./Models/HubConnection.js";

var signalR = window["signalR"];

export class ViewerHubConnection {
    Connection: HubConnection;
    MessagePack: any = window['msgpack5']();
    PartialCaptureFrames: Uint8Array[] = [];

 
    Connect() {
        this.Connection = new signalR.HubConnectionBuilder()
            .withUrl("/ViewerHub")
            .withHubProtocol(new signalR.protocols.msgpack.MessagePackHubProtocol())
            .configureLogging(signalR.LogLevel.Information)
            .build();

        this.ApplyMessageHandlers(this.Connection);

        this.Connection.start().then(() => {
            this.SendScreenCastRequestToDevice();
        }).catch(err => {
            console.error(err.toString());
            console.log("Connection closed.");
            UI.StatusMessage.innerHTML = `Connection error: ${err.message}`;
            UI.ToggleConnectUI(true);
        });

        this.Connection.onclose(() => {
            UI.ToggleConnectUI(true);
        });

        ViewerApp.ClipboardWatcher.WatchClipboard();
    }

    ChangeWindowsSession(sessionID: number) {
        if (ViewerApp.Mode == RemoteControlMode.Unattended) {
            this.Connection.invoke("ChangeWindowsSession", sessionID);
        }
    }

    SendDtoToClient(dto: BaseDto): Promise<any> {
        return this.Connection.invoke("SendDtoToClient", this.MessagePack.encode(dto));
    }

    SendIceCandidate(candidate: RTCIceCandidate) {
        if (candidate) {
            this.Connection.invoke("SendIceCandidateToAgent", candidate.candidate, candidate.sdpMLineIndex, candidate.sdpMid);
        }
        else {
            this.Connection.invoke("SendIceCandidateToAgent", "", 0, "");
        }
    }
    SendRtcAnswer(sessionDescription: RTCSessionDescription) {
        this.Connection.invoke("SendRtcAnswerToAgent", sessionDescription.sdp);
    }


    SendScreenCastRequestToDevice() {
        this.Connection.invoke("SendScreenCastRequestToDevice", ViewerApp.CasterID, ViewerApp.RequesterName, ViewerApp.Mode, ViewerApp.Otp);
    }



    private ApplyMessageHandlers(hubConnection) {
        hubConnection.on("SendDtoToBrowser", (dto: ArrayBuffer) => {
            ViewerApp.DtoMessageHandler.ParseBinaryMessage(dto);
        });

        hubConnection.on("ConnectionFailed", () => {
            UI.ConnectButton.removeAttribute("disabled");
            UI.StatusMessage.innerHTML = "Connection failed or was denied.";
            ShowMessage("连接失败请重新连接");
            this.Connection.stop();
        });
        hubConnection.on("ConnectionRequestDenied", () => {
            this.Connection.stop();
            UI.StatusMessage.innerHTML = "连接创建请求被拒绝";
            ShowMessage("连接创建请求被拒绝");
        });
        hubConnection.on("Unauthorized", () => {
            UI.ConnectButton.removeAttribute("disabled");
            UI.StatusMessage.innerHTML = "授权验证失败";
            ShowMessage("授权验证失败");
            this.Connection.stop();
        });
        hubConnection.on("ViewerRemoved", () => {
            UI.ConnectButton.removeAttribute("disabled");
            UI.StatusMessage.innerHTML = "对方终止了会话";
            ShowMessage("会话结束.");
            this.Connection.stop();
        });
        hubConnection.on("SessionIDNotFound", () => {
            UI.ConnectButton.removeAttribute("disabled");
            UI.StatusMessage.innerHTML = "会话Id不存在";
            this.Connection.stop();
        });
        hubConnection.on("ScreenCasterDisconnected", () => {
            UI.StatusMessage.innerHTML = "服务器已断开连接";
            this.Connection.stop();
        });
        hubConnection.on("RelaunchedScreenCasterReady", (newClientID: string) => {
            ViewerApp.CasterID = newClientID;
            this.Connection.stop();
            this.Connect();
        });
      
        hubConnection.on("Reconnecting", () => {
            ShowMessage("重连中...");
        });

        hubConnection.on("CursorChange", (cursor: CursorInfo) => {
            UI.UpdateCursor(cursor.ImageBytes, cursor.HotSpot.X, cursor.HotSpot.Y, cursor.CssOverride);
        });

        hubConnection.on("RequestingScreenCast", () => {
            ShowMessage("正在请求远程控制...");
        });


        hubConnection.on("ReceiveRtcOffer", async (sdp: string, iceServers: IceServerModel[]) => {
            console.log("Rtc offer SDP received.");
            ViewerApp.RtcSession.Init(iceServers);
            await ViewerApp.RtcSession.ReceiveRtcOffer(sdp);
            
        });
        hubConnection.on("ReceiveIceCandidate", (candidate: string, sdpMlineIndex: number, sdpMid: string) => {
            console.log("Ice candidate received.");
            ViewerApp.RtcSession.ReceiveCandidate({
                candidate: candidate,
                sdpMLineIndex: sdpMlineIndex,
                sdpMid: sdpMid
            } as any);
        });
        hubConnection.on("ShowMessage", (message: string) => {
            ShowMessage(message);
        });
        hubConnection.on("WindowsSessions", (windowsSessions: Array<WindowsSession>) => {
            UI.UpdateWindowsSessions(windowsSessions);
        });
    }
}