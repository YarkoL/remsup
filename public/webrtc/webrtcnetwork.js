var __extends = this && this.__extends || function(e, t) {
    for (var n in t)
        if (t.hasOwnProperty(n)) e[n] = t[n];
    function i() {
        this.constructor = e
    }
    e.prototype = t === null ? Object.create(t) : (i.prototype = t.prototype, new i)
};

var WebRtcNetworkServerState;
(function(e) {
    e[e["Invalid"] = 0] = "Invalid";
    e[e["Offline"] = 1] = "Offline";
    e[e["Starting"] = 2] = "Starting";
    e[e["Online"] = 3] = "Online"
})(WebRtcNetworkServerState || (WebRtcNetworkServerState = {}));

var SignalingConfig = function() {
    function e(e) {
        this.mNetwork = e
    }
    e.prototype.GetNetwork = function() {
        return this.mNetwork
    };
    return e
}();

var SignalingInfo = function() {
    function e(e, t, n) {
        this.mConnectionId = e;
        this.mIsIncoming = t;
        this.mCreationTime = n;
        this.mSignalingConnected = true
    }
    e.prototype.IsSignalingConnected = function() {
        return this.mSignalingConnected
    };
    Object.defineProperty(e.prototype, "ConnectionId", {
        get: function() {
            return this.mConnectionId
        },
        enumerable: true,
        configurable: true
    });
    e.prototype.IsIncoming = function() {
        return this.mIsIncoming
    };
    e.prototype.GetCreationTimeMs = function() {
        return Date.now() - this.mCreationTime
    };
    e.prototype.SignalingDisconnected = function() {
        this.mSignalingConnected = false
    };
    return e
}();

var WebRtcNetwork = function() {
    function e(e, t) {
        this.mTimeout = 6e4;
        this.mInSignaling = {};
        this.mNextId = new ConnectionId(1);
        this.mSignaling = null;
        this.mEvents = new Queue;
        this.mIdToConnection = {};
        this.mConnectionIds = new Array;
        this.mServerState = WebRtcNetworkServerState.Offline;
        this.mIsDisposed = false;
        this.mSignaling = e;
        this.mSignalingNetwork = this.mSignaling.GetNetwork();
        this.mRtcConfig = t
    }
    Object.defineProperty(e.prototype, "IdToConnection", {
        get: function() {
            return this.mIdToConnection
        },
        enumerable: true,
        configurable: true
    });
    e.prototype.GetConnections = function() {
        return this.mConnectionIds
    };
    e.prototype.SetLog = function(e) {
        this.mLogDelegate = e
    };
    e.prototype.StartServer = function(e) {
        this.mServerState = WebRtcNetworkServerState.Starting;
        this.mSignalingNetwork.StartServer(e)
    };
    e.prototype.StopServer = function() {
        if (this.mServerState == WebRtcNetworkServerState.Starting) {
            this.mSignalingNetwork.StopServer()
        } else if (this.mServerState == WebRtcNetworkServerState.Online) {
            this.mSignalingNetwork.StopServer()
        }
    };
    e.prototype.Connect = function(e) {
        console.log("Connecting ...");
        return this.AddOutgoingConnection(e)
    };
    e.prototype.Update = function() {
        this.CheckSignalingState();
        this.UpdateSignalingNetwork();
        this.UpdatePeers()
    };
    e.prototype.Dequeue = function() {
        if (this.mEvents.Count() > 0) return this.mEvents.Dequeue();
        return null
    };
    e.prototype.Peek = function() {
        if (this.mEvents.Count() > 0) return this.mEvents.Peek();
        return null
    };
    e.prototype.Flush = function() {
        this.mSignalingNetwork.Flush()
    };
    e.prototype.SendData = function(e, t, n) {
        if (e == null || t == null || t.length == 0) return;
        var i = this.mIdToConnection[e.id];
        if (i) {
            i.SendData(t, n)
        } else {
            Debug.LogWarning("unknown connection id")
        }
    };
    e.prototype.Disconnect = function(e) {
        var t = this.mIdToConnection[e.id];
        if (t) {
            this.HandleDisconnect(e)
        }
    };
    e.prototype.Shutdown = function() {
        for (var e = 0, t = this.mConnectionIds; e < t.length; e++) {
            var n = t[e];
            this.Disconnect(n)
        }
        this.StopServer();
        this.mSignalingNetwork.Shutdown()
    };
    e.prototype.DisposeInternal = function() {
        if (this.mIsDisposed == false) {
            this.Shutdown();
            this.mIsDisposed = true
        }
    };
    e.prototype.Dispose = function() {
        this.DisposeInternal()
    };
    e.prototype.CreatePeer = function(e, t) {
        var n = new WebRtcDataPeer(e, t);
        return n
    };
    e.prototype.CheckSignalingState = function() {
        var e = new Array;
        var t = new Array;
        for (var n in this.mInSignaling) {
            var i = this.mInSignaling[n];
            i.Update();
            var o = i.SignalingInfo.GetCreationTimeMs();
            var r = new Output;
            while (i.DequeueSignalingMessage(r)) {
                var a = this.StringToBuffer(r.val);
                this.mSignalingNetwork.SendData(new ConnectionId(+n), a, true)
            }
            if (i.GetState() == WebRtcPeerState.Connected) {
                e.push(i.SignalingInfo.ConnectionId)
            } else if (i.GetState() == WebRtcPeerState.SignalingFailed || o > this.mTimeout) {
                t.push(i.SignalingInfo.ConnectionId)
            }
        }
        for (var s = 0, c = e; s < c.length; s++) {
            var l = c[s];
            this.ConnectionEstablished(l)
        }
        for (var u = 0, g = t; u < g.length; u++) {
            var l = g[u];
            this.SignalingFailed(l)
        }
    };
    e.prototype.UpdateSignalingNetwork = function() {
        this.mSignalingNetwork.Update();
        var e;
        while ((e = this.mSignalingNetwork.Dequeue()) != null) {
            if (e.Type == NetEventType.ServerInitialized) {
                this.mServerState = WebRtcNetworkServerState.Online;
                this.mEvents.Enqueue(new NetworkEvent(NetEventType.ServerInitialized, ConnectionId.INVALID, e.RawData))
            } else if (e.Type == NetEventType.ServerInitFailed) {
                this.mServerState = WebRtcNetworkServerState.Offline;
                this.mEvents.Enqueue(new NetworkEvent(NetEventType.ServerInitFailed, ConnectionId.INVALID, e.RawData))
            } else if (e.Type == NetEventType.ServerClosed) {
                this.mServerState = WebRtcNetworkServerState.Offline;
                this.mEvents.Enqueue(new NetworkEvent(NetEventType.ServerClosed, ConnectionId.INVALID, e.RawData))
            } else if (e.Type == NetEventType.NewConnection) {
                var t = this.mInSignaling[e.ConnectionId.id];
                if (t) {
                    t.StartSignaling()
                } else {
                    this.AddIncomingConnection(e.ConnectionId)
                }
            } else if (e.Type == NetEventType.ConnectionFailed) {
                this.SignalingFailed(e.ConnectionId)
            } else if (e.Type == NetEventType.Disconnected) {
                var t = this.mInSignaling[e.ConnectionId.id];
                if (t) {
                    t.SignalingInfo.SignalingDisconnected()
                }
            } else if (e.Type == NetEventType.ReliableMessageReceived) {
                var t = this.mInSignaling[e.ConnectionId.id];
                if (t) {
                    var n = this.BufferToString(e.MessageData);
                    t.AddSignalingMessage(n)
                } else {
                    Debug.LogWarning("Signaling message from unknown connection received")
                }
            }
        }
    };
    e.prototype.UpdatePeers = function() {
        var e = new Array;
        for (var t in this.mIdToConnection) {
            var n = this.mIdToConnection[t];
            n.Update();
            var i = new Output;
            while (n.DequeueEvent(i)) {
                this.mEvents.Enqueue(i.val)
            }
            if (n.GetState() == WebRtcPeerState.Closed) {
                e.push(n.ConnectionId)
            }
        }
        for (var o = 0, r = e; o < r.length; o++) {
            var a = r[o];
            this.HandleDisconnect(a)
        }
    };
    e.prototype.AddOutgoingConnection = function(e) {
        Debug.Log("new outgoing connection");
        var t = this.mSignalingNetwork.Connect(e);
        var n = new SignalingInfo(t, false, Date.now());
        var i = this.CreatePeer(this.NextConnectionId(), this.mRtcConfig);
        i.SetSignalingInfo(n);
        this.mInSignaling[t.id] = i;
        return i.ConnectionId
    };
    e.prototype.AddIncomingConnection = function(e) {
        Debug.Log("new incoming connection");
        var t = new SignalingInfo(e, true, Date.now());
        var n = this.CreatePeer(this.NextConnectionId(), this.mRtcConfig);
        n.SetSignalingInfo(t);
        this.mInSignaling[e.id] = n;
        n.NegotiateSignaling();
        return n.ConnectionId
    };
    e.prototype.ConnectionEstablished = function(e) {
        var t = this.mInSignaling[e.id];
        delete this.mInSignaling[e.id];
        this.mSignalingNetwork.Disconnect(e);
        this.mConnectionIds.push(t.ConnectionId);
        this.mIdToConnection[t.ConnectionId.id] = t;
        this.mEvents.Enqueue(new NetworkEvent(NetEventType.NewConnection, t.ConnectionId, null))
    };
    e.prototype.SignalingFailed = function(e) {
        var t = this.mInSignaling[e.id];
        if (t) {
            delete this.mInSignaling[e.id];
            this.mEvents.Enqueue(new NetworkEvent(NetEventType.ConnectionFailed, t.ConnectionId, null));
            if (t.SignalingInfo.IsSignalingConnected()) {
                this.mSignalingNetwork.Disconnect(e)
            }
            t.Dispose()
        }
    };
    e.prototype.HandleDisconnect = function(e) {
        var t = this.mIdToConnection[e.id];
        if (t) {
            t.Dispose()
        }
        var n = this.mConnectionIds.indexOf(e);
        if (n != -1) {
            this.mConnectionIds.splice(n, 1)
        }
        delete this.mIdToConnection[e.id];
        var i = new NetworkEvent(NetEventType.Disconnected, e, null);
        this.mEvents.Enqueue(i)
    };
    e.prototype.NextConnectionId = function() {
        var e = new ConnectionId(this.mNextId.id);
        this.mNextId.id++;
        return e
    };
    e.prototype.StringToBuffer = function(e) {
        var t = new ArrayBuffer(e.length * 2);
        var n = new Uint16Array(t);
        for (var i = 0, o = e.length; i < o; i++) {
            n[i] = e.charCodeAt(i)
        }
        var r = new Uint8Array(t);
        return r
    };
    e.prototype.BufferToString = function(e) {
        var t = new Uint16Array(e.buffer, e.byteOffset, e.byteLength / 2);
        return String.fromCharCode.apply(null, t)
    };
    return e
}();

var WebRtcPeerState;
(function(e) {
    e[e["Invalid"] = 0] = "Invalid";
    e[e["Created"] = 1] = "Created";
    e[e["Signaling"] = 2] = "Signaling";
    e[e["SignalingFailed"] = 3] = "SignalingFailed";
    e[e["Connected"] = 4] = "Connected";
    e[e["Closing"] = 5] = "Closing";
    e[e["Closed"] = 6] = "Closed"
})(WebRtcPeerState || (WebRtcPeerState = {}));
var WebRtcInternalState;
(function(e) {
    e[e["None"] = 0] = "None";
    e[e["Signaling"] = 1] = "Signaling";
    e[e["SignalingFailed"] = 2] = "SignalingFailed";
    e[e["Connected"] = 3] = "Connected";
    e[e["Closed"] = 4] = "Closed"
})(WebRtcInternalState || (WebRtcInternalState = {}));

var AWebRtcPeer = function() {
    function e(e) {
        this.mState = WebRtcPeerState.Invalid;
        this.mRtcInternalState = WebRtcInternalState.None;
        this.mIncomingSignalingQueue = new Queue;
        this.mOutgoingSignalingQueue = new Queue;
        this.mDidSendRandomNumber = false;
        this.mRandomNumerSent = 0;
        this.mOfferOptions = {
            offerToReceiveAudio: 0,
            offerToReceiveVideo: 0
        };
        this.gConnectionConfig = {
            optional: [{
                DtlsSrtpKeyAgreement: true
            }]
        };
        this.SetupPeer(e);
        this.OnSetup();
        this.mState = WebRtcPeerState.Created
    }
    e.prototype.GetState = function() {
        return this.mState
    };
    e.prototype.SetupPeer = function(e) {
        var t = this;
        var n = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
        this.mPeer = new n(e, this.gConnectionConfig);
        this.mPeer.onicecandidate = function(e) {
            t.OnIceCandidate(e)
        };
        this.mPeer.oniceconnectionstatechange = function(e) {
            t.OnIceConnectionChange()
        };
        this.mPeer.onnegotiationneeded = function(e) {
            t.OnRenegotiationNeeded()
        };
        this.mPeer.onsignalingstatechange = function(e) {
            t.OnSignalingChange()
        }
    };
    e.prototype.DisposeInternal = function() {
        this.Cleanup()
    };
    e.prototype.Dispose = function() {
        if (this.mPeer != null) {
            this.DisposeInternal()
        }
    };
    e.prototype.Cleanup = function() {
        if (this.mState == WebRtcPeerState.Closed || this.mState == WebRtcPeerState.Closing) {
            return
        }
        this.mState = WebRtcPeerState.Closing;
        this.OnCleanup();
        if (this.mPeer != null) this.mPeer.close();
        this.mState = WebRtcPeerState.Closed
    };
    e.prototype.Update = function() {
        if (this.mState != WebRtcPeerState.Closed && this.mState != WebRtcPeerState.Closing && this.mState != WebRtcPeerState.SignalingFailed) this.UpdateState();
        if (this.mState == WebRtcPeerState.Signaling || this.mState == WebRtcPeerState.Created) this.HandleIncomingSignaling()
    };
    e.prototype.UpdateState = function() {
        if (this.mRtcInternalState == WebRtcInternalState.Closed) {
            this.Cleanup()
        } else if (this.mRtcInternalState == WebRtcInternalState.SignalingFailed) {
            this.mState = WebRtcPeerState.SignalingFailed
        } else if (this.mRtcInternalState == WebRtcInternalState.Connected) {
            this.mState = WebRtcPeerState.Connected
        }
    };
    e.prototype.HandleIncomingSignaling = function() {
        while (this.mIncomingSignalingQueue.Count() > 0) {
            var e = this.mIncomingSignalingQueue.Dequeue();
            var t = Helper.tryParseInt(e);
            if (t != null) {
                if (this.mDidSendRandomNumber) {
                    if (t < this.mRandomNumerSent) {
                        SLog.L("Signaling negotiation complete. Starting signaling.");
                        this.StartSignaling()
                    } else if (t == this.mRandomNumerSent) {
                        this.NegotiateSignaling()
                    } else {
                        SLog.L("Signaling negotiation complete. Waiting for signaling.")
                    }
                } else {}
            } else {
                var n = JSON.parse(e);
                if (n.sdp) {
                    var i = new RTCSessionDescription(n);
                    if (i.type == "offer") {
                        this.CreateAnswer(i)
                    } else {
                        this.RecAnswer(i)
                    }
                } else {
                    var o = new RTCIceCandidate(n);
                    if (o != null) {
                        this.mPeer.addIceCandidate(o, function() {}, function(e) {
                            Debug.LogError(e)
                        })
                    }
                }
            }
        }
    };
    e.prototype.AddSignalingMessage = function(e) {
        Debug.Log("incoming Signaling message " + e);
        this.mIncomingSignalingQueue.Enqueue(e)
    };
    e.prototype.DequeueSignalingMessage = function(e) {
        {
            if (this.mOutgoingSignalingQueue.Count() > 0) {
                e.val = this.mOutgoingSignalingQueue.Dequeue();
                return true
            } else {
                e.val = null;
                return false
            }
        }
    };
    e.prototype.EnqueueOutgoing = function(e) {
        {
            Debug.Log("Outgoing Signaling message " + e);
            this.mOutgoingSignalingQueue.Enqueue(e)
        }
    };
    e.prototype.StartSignaling = function() {
        this.OnStartSignaling();
        this.CreateOffer()
    };
    e.prototype.NegotiateSignaling = function() {
        var e = Random.getRandomInt(0, 2147483647);
        this.mRandomNumerSent = e;
        this.mDidSendRandomNumber = true;
        this.EnqueueOutgoing("" + e)
    };
    e.prototype.CreateOffer = function() {
        var e = this;
        Debug.Log("CreateOffer");
        this.mPeer.createOffer(function(t) {
            var n = JSON.stringify(t);
            e.mPeer.setLocalDescription(t, function() {
                e.RtcSetSignalingStarted();
                e.EnqueueOutgoing(n)
            }, function(t) {
                Debug.LogError(t);
                e.RtcSetSignalingFailed()
            })
        }, function(t) {
            Debug.LogError(t);
            e.RtcSetSignalingFailed()
        }, this.mOfferOptions)
    };
    e.prototype.CreateAnswer = function(e) {
        var t = this;
        Debug.Log("CreateAnswer");
        this.mPeer.setRemoteDescription(e, function() {
            t.mPeer.createAnswer(function(e) {
                var n = JSON.stringify(e);
                t.mPeer.setLocalDescription(e, function() {
                    t.RtcSetSignalingStarted();
                    t.EnqueueOutgoing(n)
                }, function(e) {
                    Debug.LogError(e);
                    t.RtcSetSignalingFailed()
                })
            }, function(e) {
                Debug.LogError(e);
                t.RtcSetSignalingFailed()
            })
        }, function(e) {
            Debug.LogError(e);
            t.RtcSetSignalingFailed()
        })
    };
    e.prototype.RecAnswer = function(e) {
        var t = this;
        Debug.Log("RecAnswer");
        this.mPeer.setRemoteDescription(e, function() {}, function(e) {
            Debug.LogError(e);
            t.RtcSetSignalingFailed()
        })
    };
    e.prototype.RtcSetSignalingStarted = function() {
        if (this.mRtcInternalState == WebRtcInternalState.None) {
            this.mRtcInternalState = WebRtcInternalState.Signaling
        }
    };
    e.prototype.RtcSetSignalingFailed = function() {
        this.mRtcInternalState = WebRtcInternalState.SignalingFailed
    };
    e.prototype.RtcSetConnected = function() {
        if (this.mRtcInternalState == WebRtcInternalState.Signaling) this.mRtcInternalState = WebRtcInternalState.Connected
    };
    e.prototype.RtcSetClosed = function() {
        if (this.mRtcInternalState == WebRtcInternalState.Connected) this.mRtcInternalState = WebRtcInternalState.Closed
    };
    e.prototype.OnIceCandidate = function(e) {
        if (e && e.candidate) {
            var t = e.candidate;
            var n = JSON.stringify(t);
            this.EnqueueOutgoing(n)
        }
    };
    e.prototype.OnIceConnectionChange = function() {
        Debug.Log(this.mPeer.iceConnectionState);
        if (this.mPeer.iceConnectionState == "failed") {
            this.mState = WebRtcPeerState.SignalingFailed
        }
    };
    e.prototype.OnIceGatheringChange = function() {
        Debug.Log(this.mPeer.iceGatheringState)
    };
    e.prototype.OnRenegotiationNeeded = function() {};
    e.prototype.OnSignalingChange = function() {
        Debug.Log(this.mPeer.signalingState);
        if (this.mPeer.signalingState == "closed") {
            this.RtcSetClosed()
        }
    };
    return e
}();

var WebRtcDataPeer = function(e) {
    __extends(t, e);

    function t(t, n) {
        e.call(this, n);
        this.mInfo = null;
        this.mEvents = new Queue;
        this.mReliableDataChannelReady = false;
        this.mUnreliableDataChannelReady = false;
        this.mConnectionId = t
    }
    Object.defineProperty(t.prototype, "ConnectionId", {
        get: function() {
            return this.mConnectionId
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "SignalingInfo", {
        get: function() {
            return this.mInfo
        },
        enumerable: true,
        configurable: true
    });
    t.prototype.SetSignalingInfo = function(e) {
        this.mInfo = e
    };
    t.prototype.OnSetup = function() {
        var e = this;
        this.mPeer.ondatachannel = function(t) {
            e.OnDataChannel(t.channel)
        }
    };
    t.prototype.OnStartSignaling = function() {
        var e = {};
        this.mReliableDataChannel = this.mPeer.createDataChannel(t.sLabelReliable, e);
        this.RegisterObserverReliable();
        var n = {};
        n.maxRetransmits = 0;
        n.ordered = false;
        this.mUnreliableDataChannel = this.mPeer.createDataChannel(t.sLabelUnreliable, n);
        this.RegisterObserverUnreliable()
    };
    t.prototype.OnCleanup = function() {
        if (this.mReliableDataChannel != null) this.mReliableDataChannel.close();
        if (this.mUnreliableDataChannel != null) this.mUnreliableDataChannel.close()
    };
    t.prototype.RegisterObserverReliable = function() {
        var e = this;
        this.mReliableDataChannel.onmessage = function(t) {
            e.ReliableDataChannel_OnMessage(t)
        };
        this.mReliableDataChannel.onopen = function(t) {
            e.ReliableDataChannel_OnOpen()
        };
        this.mReliableDataChannel.onclose = function(t) {
            e.ReliableDataChannel_OnClose()
        };
        this.mReliableDataChannel.onerror = function(t) {
            e.ReliableDataChannel_OnError("")
        }
    };
    t.prototype.RegisterObserverUnreliable = function() {
        var e = this;
        this.mUnreliableDataChannel.onmessage = function(t) {
            e.UnreliableDataChannel_OnMessage(t)
        };
        this.mUnreliableDataChannel.onopen = function(t) {
            e.UnreliableDataChannel_OnOpen()
        };
        this.mUnreliableDataChannel.onclose = function(t) {
            e.UnreliableDataChannel_OnClose()
        };
        this.mUnreliableDataChannel.onerror = function(t) {
            e.UnreliableDataChannel_OnError("")
        }
    };
    t.prototype.SendData = function(e, t) {
        var n = e;
        if (t) {
            this.mReliableDataChannel.send(n)
        } else {
            this.mUnreliableDataChannel.send(n)
        }
    };
    t.prototype.DequeueEvent = function(e) {
        {
            if (this.mEvents.Count() > 0) {
                e.val = this.mEvents.Dequeue();
                return true
            }
        }
        return false
    };
    t.prototype.Enqueue = function(e) {
        {
            this.mEvents.Enqueue(e)
        }
    };
    t.prototype.OnDataChannel = function(e) {
        var n = e;
        if (n.label == t.sLabelReliable) {
            this.mReliableDataChannel = n;
            this.RegisterObserverReliable()
        } else if (n.label == t.sLabelUnreliable) {
            this.mUnreliableDataChannel = n;
            this.RegisterObserverUnreliable()
        } else {
            Debug.LogError("Datachannel with unexpected label " + n.label)
        }
    };
    t.prototype.RtcOnMessageReceived = function(e, t) {
        var n = NetEventType.UnreliableMessageReceived;
        if (t) {
            n = NetEventType.ReliableMessageReceived
        }
        if (e.data instanceof ArrayBuffer) {
            var i = new Uint8Array(e.data);
            this.Enqueue(new NetworkEvent(n, this.mConnectionId, i))
        } else if (e.data instanceof Blob) {
            var o = this.mConnectionId;
            var r = new FileReader;
            var a = this;
            r.onload = function() {
                var e = new Uint8Array(this.result);
                a.Enqueue(new NetworkEvent(n, a.mConnectionId, e))
            };
            r.readAsArrayBuffer(e.data)
        } else {
            Debug.LogError("Invalid message type. Only blob and arraybuffer supported: " + e.data)
        }
    };
    t.prototype.ReliableDataChannel_OnMessage = function(e) {
        Debug.Log("ReliableDataChannel_OnMessage ");
        this.RtcOnMessageReceived(e, true)
    };
    t.prototype.ReliableDataChannel_OnOpen = function() {
        Debug.Log("mReliableDataChannelReady");
        this.mReliableDataChannelReady = true;
        if (this.IsRtcConnected()) {
            this.RtcSetConnected();
            Debug.Log("Fully connected")
        }
    };
    t.prototype.ReliableDataChannel_OnClose = function() {
        this.RtcSetClosed()
    };
    t.prototype.ReliableDataChannel_OnError = function(e) {
        Debug.LogError(e);
        this.RtcSetClosed()
    };
    t.prototype.UnreliableDataChannel_OnMessage = function(e) {
        Debug.Log("UnreliableDataChannel_OnMessage ");
        this.RtcOnMessageReceived(e, false)
    };
    t.prototype.UnreliableDataChannel_OnOpen = function() {
        Debug.Log("mUnreliableDataChannelReady");
        this.mUnreliableDataChannelReady = true;
        if (this.IsRtcConnected()) {
            this.RtcSetConnected();
            Debug.Log("Fully connected")
        }
    };
    t.prototype.UnreliableDataChannel_OnClose = function() {
        this.RtcSetClosed()
    };
    t.prototype.UnreliableDataChannel_OnError = function(e) {
        Debug.LogError(e);
        this.RtcSetClosed()
    };
    t.prototype.IsRtcConnected = function() {
        return this.mReliableDataChannelReady && this.mUnreliableDataChannelReady
    };
    t.sLabelReliable = "reliable";
    t.sLabelUnreliable = "unreliable";
    return t
}(AWebRtcPeer);

var WebsocketConnectionStatus;
(function(e) {
    e[e["Uninitialized"] = 0] = "Uninitialized";
    e[e["NotConnected"] = 1] = "NotConnected";
    e[e["Connecting"] = 2] = "Connecting";
    e[e["Connected"] = 3] = "Connected";
    e[e["Disconnecting"] = 4] = "Disconnecting"
})(WebsocketConnectionStatus || (WebsocketConnectionStatus = {}));
var WebsocketServerStatus;
(function(e) {
    e[e["Offline"] = 0] = "Offline";
    e[e["Starting"] = 1] = "Starting";
    e[e["Online"] = 2] = "Online";
    e[e["ShuttingDown"] = 3] = "ShuttingDown"
})(WebsocketServerStatus || (WebsocketServerStatus = {}));
var WebsocketNetwork = function() {
    function e(e) {
        this.mStatus = WebsocketConnectionStatus.Uninitialized;
        this.mOutgoingQueue = new Array;
        this.mIncomingQueue = new Array;
        this.mServerStatus = WebsocketServerStatus.Offline;
        this.mConnecting = new Array;
        this.mConnections = new Array;
        this.mNextOutgoingConnectionId = new ConnectionId(1);
        this.mUrl = null;
        this.mIsDisposed = false;
        this.mUrl = e;
        this.mStatus = WebsocketConnectionStatus.NotConnected
    }
    e.prototype.getStatus = function() {
        return this.mStatus
    };
    e.prototype.WebsocketConnect = function() {
        var e = this;
        this.mStatus = WebsocketConnectionStatus.Connecting;
        this.mSocket = new WebSocket(this.mUrl);
        this.mSocket.binaryType = "arraybuffer";
        this.mSocket.onopen = function() {
            e.OnWebsocketOnOpen()
        };
        this.mSocket.onerror = function(t) {
            e.OnWebsocketOnError(t)
        };
        this.mSocket.onmessage = function(t) {
            e.OnWebsocketOnMessage(t)
        };
        this.mSocket.onclose = function(t) {
            e.OnWebsocketOnClose(t)
        }
    };
    e.prototype.WebsocketCleanup = function() {
        this.mSocket.onopen = null;
        this.mSocket.onerror = null;
        this.mSocket.onmessage = null;
        this.mSocket.onclose = null;
        if (this.mSocket.readyState == this.mSocket.OPEN || this.mSocket.readyState == this.mSocket.CONNECTING) {
            this.mSocket.close()
        }
        this.mSocket = null
    };
    e.prototype.EnsureServerConnection = function() {
        if (this.mStatus == WebsocketConnectionStatus.NotConnected) {
            this.WebsocketConnect()
        }
    };
    e.prototype.CheckSleep = function() {
        if (this.mStatus == WebsocketConnectionStatus.Connected && this.mServerStatus == WebsocketServerStatus.Offline && this.mConnecting.length == 0 && this.mConnections.length == 0) {
            this.Cleanup()
        }
    };
    e.prototype.OnWebsocketOnOpen = function() {
        console.log("onWebsocketOnOpen");
        this.mStatus = WebsocketConnectionStatus.Connected
    };
    e.prototype.OnWebsocketOnClose = function(e) {
        console.log("Closed: " + JSON.stringify(e));
        if (this.mStatus == WebsocketConnectionStatus.Disconnecting || this.mStatus == WebsocketConnectionStatus.NotConnected) return;
        this.Cleanup();
        this.mStatus = WebsocketConnectionStatus.NotConnected
    };
    e.prototype.OnWebsocketOnMessage = function(e) {
        if (this.mStatus == WebsocketConnectionStatus.Disconnecting || this.mStatus == WebsocketConnectionStatus.NotConnected) return;
        var t = NetworkEvent.fromByteArray(new Uint8Array(e.data));
        this.HandleIncomingEvent(t)
    };
    e.prototype.OnWebsocketOnError = function(e) {
        if (this.mStatus == WebsocketConnectionStatus.Disconnecting || this.mStatus == WebsocketConnectionStatus.NotConnected) return;
        console.log("WebSocket Error " + e)
    };
    e.prototype.Cleanup = function() {
        if (this.mStatus == WebsocketConnectionStatus.Disconnecting || this.mStatus == WebsocketConnectionStatus.NotConnected) return;
        this.mStatus = WebsocketConnectionStatus.Disconnecting;
        for (var e = 0, t = this.mConnecting; e < t.length; e++) {
            var n = t[e];
            this.EnqueueIncoming(new NetworkEvent(NetEventType.ConnectionFailed, new ConnectionId(n), null))
        }
        this.mConnecting = new Array;
        for (var i = 0, o = this.mConnections; i < o.length; i++) {
            var n = o[i];
            this.EnqueueIncoming(new NetworkEvent(NetEventType.Disconnected, new ConnectionId(n), null))
        }
        this.mConnections = new Array;
        if (this.mServerStatus == WebsocketServerStatus.Starting) {
            this.EnqueueIncoming(new NetworkEvent(NetEventType.ServerInitFailed, ConnectionId.INVALID, null))
        } else if (this.mServerStatus == WebsocketServerStatus.Online) {
            this.EnqueueIncoming(new NetworkEvent(NetEventType.ServerClosed, ConnectionId.INVALID, null))
        } else if (this.mServerStatus == WebsocketServerStatus.ShuttingDown) {
            this.EnqueueIncoming(new NetworkEvent(NetEventType.ServerClosed, ConnectionId.INVALID, null))
        }
        this.mServerStatus = WebsocketServerStatus.Offline;
        this.mOutgoingQueue = new Array;
        this.WebsocketCleanup();
        this.mStatus = WebsocketConnectionStatus.NotConnected
    };
    e.prototype.EnqueueOutgoing = function(e) {
        this.mOutgoingQueue.push(e)
    };
    e.prototype.EnqueueIncoming = function(e) {
        this.mIncomingQueue.push(e)
    };
    e.prototype.TryRemoveConnecting = function(e) {
        var t = this.mConnecting.indexOf(e.id);
        if (t != -1) {
            this.mConnecting.splice(t, 1)
        }
    };
    e.prototype.TryRemoveConnection = function(e) {
        var t = this.mConnections.indexOf(e.id);
        if (t != -1) {
            this.mConnections.splice(t, 1)
        }
    };
    e.prototype.HandleIncomingEvent = function(e) {
        if (e.Type == NetEventType.NewConnection) {
            this.TryRemoveConnecting(e.ConnectionId);
            this.mConnections.push(e.ConnectionId.id)
        } else if (e.Type == NetEventType.ConnectionFailed) {
            this.TryRemoveConnecting(e.ConnectionId)
        } else if (e.Type == NetEventType.Disconnected) {
            this.TryRemoveConnection(e.ConnectionId)
        } else if (e.Type == NetEventType.ServerInitialized) {
            this.mServerStatus = WebsocketServerStatus.Online
        } else if (e.Type == NetEventType.ServerInitFailed) {
            this.mServerStatus = WebsocketServerStatus.Offline
        } else if (e.Type == NetEventType.ServerClosed) {
            this.mServerStatus = WebsocketServerStatus.ShuttingDown;
            this.mServerStatus = WebsocketServerStatus.Offline
        }
        this.EnqueueIncoming(e)
    };
    e.prototype.HandleOutgoingEvents = function() {
        while (this.mOutgoingQueue.length > 0) {
            var e = this.mOutgoingQueue.shift();
            var t = NetworkEvent.toByteArray(e);
            this.mSocket.send(t)
        }
    };
    e.prototype.NextConnectionId = function() {
        var e = this.mNextOutgoingConnectionId;
        this.mNextOutgoingConnectionId = new ConnectionId(this.mNextOutgoingConnectionId.id + 1);
        return e
    };
    e.prototype.GetRandomKey = function() {
        var e = "";
        for (var t = 0; t < 7; t++) {
            e += String.fromCharCode(65 + Math.round(Math.random() * 25))
        }
        return e
    };
    e.prototype.Dequeue = function() {
        if (this.mIncomingQueue.length > 0) return this.mIncomingQueue.shift();
        return null
    };
    e.prototype.Peek = function() {
        if (this.mIncomingQueue.length > 0) return this.mIncomingQueue[0];
        return null
    };
    e.prototype.Update = function() {
        this.CheckSleep()
    };
    e.prototype.Flush = function() {
        if (this.mStatus == WebsocketConnectionStatus.Connected) this.HandleOutgoingEvents()
    };
    e.prototype.SendData = function(e, t, n) {
        if (e == null || t == null || t.length == 0) return;
        var i;
        if (n) {
            i = new NetworkEvent(NetEventType.ReliableMessageReceived, e, t)
        } else {
            i = new NetworkEvent(NetEventType.UnreliableMessageReceived, e, t)
        }
        this.EnqueueOutgoing(i)
    };
    e.prototype.Disconnect = function(e) {
        var t = new NetworkEvent(NetEventType.Disconnected, e, null);
        this.EnqueueOutgoing(t)
    };
    e.prototype.Shutdown = function() {
        this.Cleanup();
        this.mStatus = WebsocketConnectionStatus.NotConnected
    };
    e.prototype.Dispose = function() {
        if (this.mIsDisposed == false) {
            this.Shutdown();
            this.mIsDisposed = true
        }
    };
    e.prototype.StartServer = function(e) {
        if (e == null) {
            e = "" + this.GetRandomKey()
        }
        if (this.mServerStatus == WebsocketServerStatus.Offline) {
            this.EnsureServerConnection();
            this.mServerStatus = WebsocketServerStatus.Starting;
            this.EnqueueOutgoing(new NetworkEvent(NetEventType.ServerInitialized, ConnectionId.INVALID, e))
        } else {
            this.EnqueueIncoming(new NetworkEvent(NetEventType.ServerInitFailed, ConnectionId.INVALID, e))
        }
    };
    e.prototype.StopServer = function() {
        this.EnqueueOutgoing(new NetworkEvent(NetEventType.ServerClosed, ConnectionId.INVALID, null))
    };
    e.prototype.Connect = function(e) {
        this.EnsureServerConnection();
        var t = this.NextConnectionId();
        this.mConnecting.push(t.id);
        var n = new NetworkEvent(NetEventType.NewConnection, t, e);
        this.EnqueueOutgoing(n);
        return t
    };
    return e
}();

//Utils

function byteArrayToString(arr) {
  return String.fromCharCode.apply(String, arr);
}

function stringToByteArray(str) {
    var bytes = [];
    for (var i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
    }
    return new Uint8Array(bytes);
} 

/*
 
function stringToByteArray2(str) {
    var arrayBuf = new ArrayBuffer(str.length * 2);
    var uint16Arr = new Uint16Array(arrayBuf);
    for (var i = 0, len = str.length; i < len; i++) {
        uint16Arr[i] = str.charCodeAt(i)
    }
    var uint8Arr = new Uint8Array(t);
    return uint8Arr;
} 

*/


var Queue = function() {
    function e() {
        this.mArr = new Array
    }
    e.prototype.Enqueue = function(e) {
        this.mArr.push(e)
    };
    e.prototype.TryDequeue = function(e) {
        var t = false;
        if (this.mArr.length > 0) {
            e.val = this.mArr.shift();
            t = true
        }
        return t
    };
    e.prototype.Dequeue = function() {
        if (this.mArr.length > 0) {
            return this.mArr.shift()
        } else {
            return null
        }
    };
    e.prototype.Peek = function() {
        if (this.mArr.length > 0) {
            return this.mArr[0]
        } else {
            return null
        }
    };
    e.prototype.Count = function() {
        return this.mArr.length
    };
    return e
}();

var Output = function() {
    function e() {}
    return e
}();

var Debug = function() {
    function e() {}
    e.Log = function(e) {
        if (e == null) {
            console.debug(e)
        }
        console.debug(e)
    };
    e.LogError = function(e) {
        console.debug(e)
    };
    e.LogWarning = function(e) {
        console.debug(e)
    };
    return e
}();

var Random = function() {
    function e() {}
    e.getRandomInt = function(e, t) {
        e = Math.ceil(e);
        t = Math.floor(t);
        return Math.floor(Math.random() * (t - e)) + e
    };
    return e
}();

var Helper = function() {
    function e() {}
    e.tryParseInt = function(e) {
        try {
            if (/^(\-|\+)?([0-9]+)$/.test(e)) {
                var t = Number(e);
                if (isNaN(t) == false) return t
            }
        } catch (e) {}
        return null
    };
    return e
}();
