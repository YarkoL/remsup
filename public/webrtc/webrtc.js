
var __extends = this && this.__extends || function(e, t) {
    for (var n in t)
        if (t.hasOwnProperty(n)) e[n] = t[n];
    function i() {
        this.constructor = e
    }
    e.prototype = (t === null) ? Object.create(t) : (i.prototype = t.prototype, new i)
};

var CallException = function() {
    function e(e) {
        this.mErrorMsg = e
    }
    e.prototype.ErrorMsg = function() {};
    return e
}();
var InvalidOperationException = function(e) {
    __extends(t, e);

    function t() {
        e.apply(this, arguments)
    }
    return t
}(CallException);
var CallState;
(function(e) {
    e[e["Invalid"] = 0] = "Invalid";
    e[e["Initialized"] = 1] = "Initialized";
    e[e["Configuring"] = 2] = "Configuring";
    e[e["Configured"] = 3] = "Configured";
    e[e["RequestingAddress"] = 4] = "RequestingAddress";
    e[e["WaitingForIncomingCall"] = 5] = "WaitingForIncomingCall";
    e[e["WaitingForOutgoingCall"] = 6] = "WaitingForOutgoingCall";
    e[e["InCall"] = 7] = "InCall";
    e[e["Closed"] = 8] = "Closed"
})(CallState || (CallState = {}));
var AWebRtcCall = function() {
    function e(e) {
        if (e === void 0) {
            e = null
        }
        this.mNetworkConfig = new NetworkConfig;
        this.mMediaConfig = null;
        this.mCallEventHandlers = [];
        this.mNetwork = null;
        this.mConferenceMode = false;
        this.mState = CallState.Invalid;
        this.mIsDisposed = false;
        this.mServerInactive = true;
        this.mConnectionIds = new Array;
        this.mPendingListenCall = false;
        this.mPendingCallCall = false;
        this.mPendingAddress = null;
        if (e != null) {
            this.mNetworkConfig = e;
            this.mConferenceMode = e.IsConference
        }
    }
    e.prototype.addEventListener = function(e) {
        this.mCallEventHandlers.push(e)
    };
    e.prototype.removeEventListener = function(e) {
        this.mCallEventHandlers = this.mCallEventHandlers.filter(function(t) {
            return t !== e
        })
    };
    Object.defineProperty(e.prototype, "State", {
        get: function() {
            return this.mState
        },
        enumerable: true,
        configurable: true
    });
    e.prototype.Initialize = function(e) {
        this.mNetwork = e;
        this.mState = CallState.Initialized
    };
    e.prototype.Configure = function(e) {
        this.CheckDisposed();
        if (this.mState != CallState.Initialized) {
            throw new InvalidOperationException("Method can't be used in state " + this.mState)
        }
        this.mState = CallState.Configuring;
        console.log("Enter state CallState.Configuring");
        this.mMediaConfig = e;
        this.mNetwork.Configure(this.mMediaConfig)
    };
    e.prototype.Call = function(e) {
        this.CheckDisposed();
        if (this.mState != CallState.Initialized && this.mState != CallState.Configuring && this.mState != CallState.Configured) {
            throw new InvalidOperationException("Method can't be used in state " + this.mState)
        }
        if (this.mConferenceMode) {
            throw new InvalidOperationException("Method can't be used in conference calls.")
        }
        console.log("Call to " + e);
        this.EnsureConfiguration();
        if (this.mState == CallState.Configured) {
            this.ProcessCall(e)
        } else {
            this.PendingCall(e)
        }
    };
    e.prototype.Listen = function(e) {
        this.CheckDisposed();
        if (this.mState != CallState.Initialized && this.mState != CallState.Configuring && this.mState != CallState.Configured) {
            throw new InvalidOperationException("Method can't be used in state " + this.mState)
        }
        this.EnsureConfiguration();
        if (this.mState == CallState.Configured) {
            this.ProcessListen(e)
        } else {
            this.PendingListen(e)
        }
    };
    e.prototype.Send = function(e) {
        this.CheckDisposed();
        var t = Encoding.UTF16.GetBytes(e);
        //var t = stringToByteArray(e);
        for (var n = 0, i = this.mConnectionIds; n < i.length; n++) {
            var r = i[n];
            console.log("Send message to " + r + "! " + e);
            this.mNetwork.SendData(new ConnectionId(r), t, true)
        }
    };
    e.prototype.Update = function() {
        if (this.mIsDisposed) return;
        if (this.mNetwork == null) return;
        this.mNetwork.Update();
        if (this.mState == CallState.Configuring) {
            var e = this.mNetwork.GetConfigurationState();
            if (e == MediaConfigurationState.Failed) {
                this.OnConfigurationFailed(this.mNetwork.GetConfigurationError());
                if (this.mIsDisposed) return;
                if (this.mNetwork != null) this.mNetwork.ResetConfiguration()
            } else if (e == MediaConfigurationState.Successful) {
                this.OnConfigurationComplete();
                if (this.mIsDisposed) return
            }
        }
        var t;
        while ((t = this.mNetwork.Dequeue()) != null) {
            switch (t.Type) {
                case NetEventType.NewConnection:
                    if (this.mState == CallState.WaitingForIncomingCall || this.mConferenceMode && this.mState == CallState.InCall) {
                        if (this.mConferenceMode == false) this.mNetwork.StopServer();
                        this.mState = CallState.InCall;
                        this.mConnectionIds.push(t.ConnectionId.id);
                        this.TriggerCallEvent(new CallAcceptedEventArgs(t.ConnectionId));
                        if (this.mIsDisposed) return
                    } else if (this.mState == CallState.WaitingForOutgoingCall) {
                        this.mConnectionIds.push(t.ConnectionId.id);
                        this.mState = CallState.InCall;
                        this.TriggerCallEvent(new CallEventArgs(CallEventType.CallAccepted));
                        if (this.mIsDisposed) return
                    } else {
                        console.log("Received incoming connection during invalid state " + this.mState)
                    }
                    break;
                case NetEventType.ConnectionFailed:
                    if (this.mState == CallState.WaitingForOutgoingCall) {
                        this.TriggerCallEvent(new ErrorEventArgs(CallEventType.ConnectionFailed));
                        if (this.mIsDisposed) return;
                        this.mState = CallState.Configured
                    } else {
                        console.log("Received ConnectionFailed during " + this.mState)
                    }
                    break;
                case NetEventType.Disconnected:
                    if (this.mConnectionIds.indexOf(t.ConnectionId.id) != -1) {
                        this.mConnectionIds.splice(t.ConnectionId.id, 1);
                        if (this.mConferenceMode == false && this.mConnectionIds.length == 0) {
                            this.mState = CallState.Closed
                        }
                        this.TriggerCallEvent(new CallEndedEventArgs(t.ConnectionId));
                        if (this.mIsDisposed) return
                    }
                    break;
                case NetEventType.ServerInitialized:
                    this.mServerInactive = false;
                    this.mState = CallState.WaitingForIncomingCall;
                    this.TriggerCallEvent(new WaitForIncomingCallEventArgs(t.Info));
                    if (this.mIsDisposed) return;
                    break;
                case NetEventType.ServerInitFailed:
                    this.mServerInactive = true;
                    this.mState = CallState.Configured;
                    this.TriggerCallEvent(new ErrorEventArgs(CallEventType.ListeningFailed));
                    if (this.mIsDisposed) return;
                    break;
                case NetEventType.ServerClosed:
                    this.mServerInactive = true;
                    if (this.mState == CallState.WaitingForIncomingCall || this.mState == CallState.RequestingAddress) {
                        this.mState = CallState.Configured;
                        this.TriggerCallEvent(new ErrorEventArgs(CallEventType.ListeningFailed, CallErrorType.Unknown, "Server closed the connection while waiting for incoming calls."));
                        if (this.mIsDisposed) return
                    } else {}
                    break;
                case NetEventType.ReliableMessageReceived:
                    //var n = Encoding.UTF16.GetString(t.MessageData);
                    var n = byteArrayToString(t.MessageData);
                    this.TriggerCallEvent(new MessageEventArgs(t.ConnectionId, n));
                    if (this.mIsDisposed) return;
                    break
            }
        }
        var i = true;
        var r = true;
        if (i) {
            var o = this.mNetwork.TryGetFrame(ConnectionId.INVALID);
            if (o != null) {
                var a = new FrameUpdateEventArgs(ConnectionId.INVALID, o);
                this.TriggerCallEvent(a);
                if (this.mIsDisposed) return
            }
        }
        if (r) {
            for (var s = 0, l = this.mConnectionIds; s < l.length; s++) {
                var u = l[s];
                var c = this.mNetwork.TryGetFrame(new ConnectionId(u));
                if (c != null) {
                    var a = new FrameUpdateEventArgs(new ConnectionId(u), c);
                    this.TriggerCallEvent(a);
                    if (this.mIsDisposed) return
                }
            }
        }
        this.mNetwork.Flush()
    };
    e.prototype.PendingCall = function(e) {
        this.mPendingAddress = e;
        this.mPendingCallCall = true;
        this.mPendingListenCall = false
    };
    e.prototype.ProcessCall = function(e) {
        console.log("AWebRtcCall: WebCall " + e);
        this.mState = CallState.WaitingForOutgoingCall;
        this.mNetwork.Connect(e);
        this.ClearPending()
    };
    e.prototype.PendingListen = function(e) {
        this.mPendingAddress = e;
        this.mPendingCallCall = false;
        this.mPendingListenCall = true
    };
    e.prototype.ProcessListen = function(e) {
        console.log("AWebRtcCall: Listen at " + e);
        this.mServerInactive = false;
        this.mState = CallState.RequestingAddress;
        this.mNetwork.StartServer(e);
        this.ClearPending()
    };
    e.prototype.DoPending = function() {
        if (this.mPendingCallCall) {
            this.ProcessCall(this.mPendingAddress)
        } else if (this.mPendingListenCall) {
            this.ProcessListen(this.mPendingAddress)
        }
        this.ClearPending()
    };
    e.prototype.ClearPending = function() {
        this.mPendingAddress = null;
        this.mPendingCallCall = null;
        this.mPendingListenCall = null
    };
    e.prototype.CheckDisposed = function() {
        if (this.mIsDisposed) throw new InvalidOperationException("Object is disposed. No method calls possible.")
    };
    e.prototype.EnsureConfiguration = function() {
        if (this.mState == CallState.Initialized) {
            console.log("Use default configuration");
            this.Configure(new MediaConfig)
        } else {}
    };
    e.prototype.TriggerCallEvent = function(e) {
        var t = this.mCallEventHandlers.slice();
        for (var n = 0, i = t; n < i.length; n++) {
            var r = i[n];
            r(this, e)
        }
    };
    e.prototype.OnConfigurationComplete = function() {
        if (this.mIsDisposed) return;
        this.mState = CallState.Configured;
        console.log("Enter state CallState.Configured");
        this.TriggerCallEvent(new CallEventArgs(CallEventType.ConfigurationComplete));
        if (this.mIsDisposed == false) this.DoPending()
    };
    e.prototype.OnConfigurationFailed = function(e) {
        console.log("Configuration failed: " + e);
        if (this.mIsDisposed) return;
        this.mState = CallState.Initialized;
        this.TriggerCallEvent(new ErrorEventArgs(CallEventType.ConfigurationFailed, CallErrorType.Unknown, e));
        if (this.mIsDisposed == false) this.ClearPending()
    };
    e.prototype.DisposeInternal = function(e) {
        if (!this.mIsDisposed) {
            if (e) {}
            this.mIsDisposed = true
        }
    };
    e.prototype.Dispose = function() {
        this.DisposeInternal(true)
    };
    return e
}();
var BrowserWebRtcCall = function(e) {
    __extends(t, e);

    function t(t) {
        e.call(this, t);
        this.Initialize(this.CreateNetwork())
    }
    t.prototype.CreateNetwork = function() {
        return new BrowserMediaNetwork(this.mNetworkConfig)
    };
    t.prototype.DisposeInternal = function(t) {
        e.prototype.DisposeInternal.call(this, t);
        if (t) {
            if (this.mNetwork != null) this.mNetwork.Dispose();
            this.mNetwork = null
        }
    };
    return t
}(AWebRtcCall);
var CallEventType;
(function(e) {
    e[e["Invalid"] = 0] = "Invalid";
    e[e["WaitForIncomingCall"] = 1] = "WaitForIncomingCall";
    e[e["CallAccepted"] = 2] = "CallAccepted";
    e[e["CallEnded"] = 3] = "CallEnded";
    e[e["FrameUpdate"] = 4] = "FrameUpdate";
    e[e["Message"] = 5] = "Message";
    e[e["ConnectionFailed"] = 6] = "ConnectionFailed";
    e[e["ListeningFailed"] = 7] = "ListeningFailed";
    e[e["ConfigurationComplete"] = 8] = "ConfigurationComplete";
    e[e["ConfigurationFailed"] = 9] = "ConfigurationFailed"
})(CallEventType || (CallEventType = {}));
var CallEventArgs = function() {
    function e(e) {
        this.mType = CallEventType.Invalid;
        this.mType = e
    }
    Object.defineProperty(e.prototype, "Type", {
        get: function() {
            return this.mType
        },
        enumerable: true,
        configurable: true
    });
    return e
}();
var CallAcceptedEventArgs = function(e) {
    __extends(t, e);

    function t(t) {
        e.call(this, CallEventType.CallAccepted);
        this.mConnectionId = ConnectionId.INVALID;
        this.mConnectionId = t
    }
    Object.defineProperty(t.prototype, "ConnectionId", {
        get: function() {
            return this.mConnectionId
        },
        enumerable: true,
        configurable: true
    });
    return t
}(CallEventArgs);
var CallEndedEventArgs = function(e) {
    __extends(t, e);

    function t(t) {
        e.call(this, CallEventType.CallEnded);
        this.mConnectionId = ConnectionId.INVALID;
        this.mConnectionId = t
    }
    Object.defineProperty(t.prototype, "ConnectionId", {
        get: function() {
            return this.mConnectionId
        },
        enumerable: true,
        configurable: true
    });
    return t
}(CallEventArgs);
var CallErrorType;
(function(e) {
    e[e["Unknown"] = 0] = "Unknown"
})(CallErrorType || (CallErrorType = {}));
var ErrorEventArgs = function(e) {
    __extends(t, e);

    function t(t, n, i) {
        e.call(this, t);
        this.mErrorType = CallErrorType.Unknown;
        this.mErrorType = n;
        this.mErrorMessage = i;
        if (this.mErrorMessage == null) {
            switch (t) {
                case CallEventType.ConnectionFailed:
                    this.mErrorMessage = "Connection failed.";
                    break;
                case CallEventType.ListeningFailed:
                    this.mErrorMessage = "Failed to allow incoming connections. Address already in use or server connection failed.";
                    break;
                default:
                    this.mErrorMessage = "Unknown error.";
                    break
            }
        }
    }
    Object.defineProperty(t.prototype, "ErrorMessage", {
        get: function() {
            return this.mErrorMessage
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "ErrorType", {
        get: function() {
            return this.mErrorType
        },
        enumerable: true,
        configurable: true
    });
    return t
}(CallEventArgs);
var WaitForIncomingCallEventArgs = function(e) {
    __extends(t, e);

    function t(t) {
        e.call(this, CallEventType.WaitForIncomingCall);
        this.mAddress = t
    }
    Object.defineProperty(t.prototype, "Address", {
        get: function() {
            return this.mAddress
        },
        enumerable: true,
        configurable: true
    });
    return t
}(CallEventArgs);
var FramePixelFormat;
(function(e) {
    e[e["Invalid"] = 0] = "Invalid";
    e[e["Format32bppargb"] = 1] = "Format32bppargb"
})(FramePixelFormat || (FramePixelFormat = {}));
var MessageEventArgs = function(e) {
    __extends(t, e);

    function t(t, n) {
        e.call(this, CallEventType.Message);
        this.mConnectionId = ConnectionId.INVALID;
        this.mConnectionId = t;
        this.mAddress = n
    }
    Object.defineProperty(t.prototype, "ConnectionId", {
        get: function() {
            return this.mConnectionId
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "Content", {
        get: function() {
            return this.mAddress
        },
        enumerable: true,
        configurable: true
    });
    return t
}(CallEventArgs);
var FrameUpdateEventArgs = function(e) {
    __extends(t, e);

    function t(t, n) {
        e.call(this, CallEventType.FrameUpdate);
        this.mConnectionId = ConnectionId.INVALID;
        this.mTrackId = 0;
        this.mFormat = FramePixelFormat.Format32bppargb;
        this.mConnectionId = t;
        this.mFrame = n
    }
    Object.defineProperty(t.prototype, "Format", {
        get: function() {
            return this.mFormat
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "ConnectionId", {
        get: function() {
            return this.mConnectionId
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "TrackId", {
        get: function() {
            return this.mTrackId
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "IsRemote", {
        get: function() {
            return this.mConnectionId.id != ConnectionId.INVALID.id
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "Frame", {
        get: function() {
            return this.mFrame
        },
        enumerable: true,
        configurable: true
    });
    return t
}(CallEventArgs);
var MediaConfigurationState;
(function(e) {
    e[e["Invalid"] = 0] = "Invalid";
    e[e["NoConfiguration"] = 1] = "NoConfiguration";
    e[e["InProgress"] = 2] = "InProgress";
    e[e["Successful"] = 3] = "Successful";
    e[e["Failed"] = 4] = "Failed"
})(MediaConfigurationState || (MediaConfigurationState = {}));
var MediaConfig = function() {
    function e() {
        this.mAudio = true;
        this.mVideo = true;
        this.mMinWidth = -1;
        this.mMinHeight = -1;
        this.mMaxWidth = -1;
        this.mMaxHeight = -1;
        this.mIdealWidth = -1;
        this.mIdealHeight = -1
    }
    Object.defineProperty(e.prototype, "Audio", {
        get: function() {
            return this.mAudio
        },
        set: function(e) {
            this.mAudio = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "Video", {
        get: function() {
            return this.mVideo
        },
        set: function(e) {
            this.mVideo = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "MinWidth", {
        get: function() {
            return this.mMinWidth
        },
        set: function(e) {
            this.mMinWidth = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "MinHeight", {
        get: function() {
            return this.mMinHeight
        },
        set: function(e) {
            this.mMinHeight = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "MaxWidth", {
        get: function() {
            return this.mMaxWidth
        },
        set: function(e) {
            this.mMaxWidth = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "MaxHeight", {
        get: function() {
            return this.mMaxHeight
        },
        set: function(e) {
            this.mMaxHeight = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "IdealWidth", {
        get: function() {
            return this.mIdealWidth
        },
        set: function(e) {
            this.mIdealWidth = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "IdealHeight", {
        get: function() {
            return this.mIdealHeight
        },
        set: function(e) {
            this.mIdealHeight = e
        },
        enumerable: true,
        configurable: true
    });
    return e
}();
var NetworkConfig = function() {
    function e() {
    
      this.mIceServers = [{
        'urls':'turn: remotesupport.northeurope.cloudapp.azure.com',
        'username': 'remotesupport',
        'credential': 'h0lolens'
        }];
     
        this.mSignalingUrl = "wss://remotesupport.northeurope.cloudapp.azure.com:12777/callapp";
        
        this.mIsConference = false
    }
    Object.defineProperty(e.prototype, "IceServers", {
        get: function() {
            return this.mIceServers
        },
        set: function(e) {
            this.mIceServers = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "SignalingUrl", {
        get: function() {
            return this.mSignalingUrl
        },
        set: function(e) {
            this.mSignalingUrl = e
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "IsConference", {
        get: function() {
            return this.mIsConference
        },
        set: function(e) {
            this.mIsConference = e
        },
        enumerable: true,
        configurable: true
    });
    return e
}();

var BrowserMediaNetwork = function(e) {
    __extends(t, e);

    function t(n) {
        e.call(this, t.BuildSignalingConfig(n.SignalingUrl), t.BuildRtcConfig(n.IceServers));
        this.mNetworkConfig = null;
        this.mConfigurationState = MediaConfigurationState.Invalid;
        this.mConfigurationError = null;
        this.mMediaConfig = null;
        this.mLocalFrameBuffer = null;
        this.mConfigurationState = MediaConfigurationState.NoConfiguration
    }
    t.prototype.Configure = function(e) {
        var n = this;
        this.mMediaConfig = e;
        this.mConfigurationError = null;
        this.mConfigurationState = MediaConfigurationState.InProgress;
        if (e.Audio || e.Video) {
            var i = {
                video: e.Video,
                audio: e.Audio,
                width: {
                    ideal: 320
                },
                height: {
                    ideal: 240
                }
            };
            if (e.MinWidth != -1) i.width.min = e.MinWidth;
            if (e.MinHeight != -1) i.height.min = e.MinHeight;
            if (e.MaxWidth != -1) i.width.max = e.MaxWidth;
            if (e.MaxHeight != -1) i.height.max = e.MaxHeight;
            if (e.IdealWidth != -1) i.width.ideal = e.IdealWidth;
            if (e.IdealHeight != -1) i.height.ideal = e.IdealHeight;
            console.log("calling CallGetUserMedia");
            t.CallGetUserMedia(i).then(function(e) {
                n.mLocalFrameBuffer = new FrameBuffer(e);
                n.mLocalFrameBuffer.SetMute(true);
                n.OnConfigurationSuccess()
            }).catch(function(e) {
                console.debug(e.name + ": " + e.message);
                n.OnConfigurationFailed(e.message)
            })
        } else {
            this.OnConfigurationSuccess()
        }
    };
    t.prototype.Update = function() {
        e.prototype.Update.call(this);
        if (this.mLocalFrameBuffer != null) this.mLocalFrameBuffer.Update()
    };
    t.prototype.GetConfigurationState = function() {
        return this.mConfigurationState
    };
    t.prototype.GetConfigurationError = function() {
        return this.mConfigurationError
    };
    t.prototype.ResetConfiguration = function() {
        this.mConfigurationState = MediaConfigurationState.NoConfiguration;
        this.mMediaConfig = new MediaConfig;
        this.mConfigurationError = null
    };
    t.prototype.OnConfigurationSuccess = function() {
        this.mConfigurationState = MediaConfigurationState.Successful
    };
    t.prototype.OnConfigurationFailed = function(e) {
        this.mConfigurationError = e;
        this.mConfigurationState = MediaConfigurationState.Failed
    };
    t.prototype.PeekFrame = function(e) {
        if (e == null) return;
        if (e.id == ConnectionId.INVALID.id) {mLocalFrameBuffer
            if (this.mLocalFrameBuffer != null) {
                return this.mLocalFrameBuffer.PeekFrame()
            }
        } else {
            var t = this.IdToConnection[e.id];
            if (t != null) {
                return t.PeekFrame()
            }
        }
        return null
    };
    t.prototype.TryGetFrame = function(e) {
        if (e == null) return;
        if (e.id == ConnectionId.INVALID.id) {
            if (this.mLocalFrameBuffer != null) {
                return this.mLocalFrameBuffer.TryGetFrame()
            }
        } else {
            var t = this.IdToConnection[e.id];
            if (t != null) {
                return t.TryGetRemoteFrame()
            }
        }
        return null
    };
    t.prototype.SetVolume = function(e, t) {
        console.log("SetVolume called. Volume: " + e + " id: " + t.id);
        var n = this.IdToConnection[t.id];
        if (n != null) {
            return n.SetVolume(e)
        }
    };
    t.prototype.HasAudioTrack = function(e) {
        var t = this.IdToConnection[e.id];
        if (t != null) {
            return t.HasAudioTrack()
        }
        return false
    };
    t.prototype.HasVideoTrack = function(e) {
        var t = this.IdToConnection[e.id];
        if (t != null) {
            return t.HasVideoTrack()
        }
        return false
    };
    t.prototype.CreatePeer = function(e, t) {
        var n = new MediaPeer(e, t);
        if (this.mLocalFrameBuffer != null) n.AddLocalStream(this.mLocalFrameBuffer.Stream);
        return n
    };
    t.prototype.DisposeInternal = function() {
        e.prototype.DisposeInternal.call(this);
        this.DisposeLocalStream()
    };
    t.prototype.DisposeLocalStream = function() {
        if (this.mLocalFrameBuffer != null) {
            this.mLocalFrameBuffer.Dispose();
            this.mLocalFrameBuffer = null;
            console.log("local buffer disposed")
        }
    };
    t.BuildSignalingConfig = function(e) {
        return new SignalingConfig(new WebsocketNetwork(e));
    };
    t.BuildRtcConfig = function(e) {
        var t = {
            iceServers: e
        };
        return t
    };
    t.CallGetUserMedia = function(e) {
        var t = function(e) {
            var t = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
            if (!t) {
                return Promise.reject(new Error("getUserMedia is not implemented in this browser"))
            }
            return new Promise(function(n, i) {
                t.call(navigator, e, n, i)
            })
        };
        var n = null;
        if (navigator.mediaDevices == null || navigator.mediaDevices.getUserMedia == null) {
            n = t
        } else {
            n = function(e) {
                return navigator.mediaDevices.getUserMedia(e)
            }
        }
        return n(e)
    };
    return t
}(WebRtcNetwork);

var FrameBuffer = function() {
    function e(e) {
        this.mBufferedFrame = null;
        this.mCanvasElement = null;
        this.mIsActive = false;
        this.mMsPerFrame = 1 / 30 * 1e3;
        this.mLastFrame = 0;
        this.mHasVideo = false;
        this.mStream = e;
        if (this.mStream.getVideoTracks().length > 0) this.mHasVideo = true;
        this.SetupElements()
    }
    Object.defineProperty(e.prototype, "Stream", {
        get: function() {
            return this.mStream
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "VideoElement", {
        get: function() {
            return this.mVideoElement
        },
        enumerable: true,
        configurable: true
    });
    e.prototype.SetupElements = function() {
        var e = this;
        this.mVideoElement = this.SetupVideoElement();
        this.mVideoElement.onloadedmetadata = function(t) {
            e.mVideoElement.play();
            if (e.mHasVideo) {
                e.mCanvasElement = e.SetupCanvas();
                if (e.mCanvasElement == null) e.mHasVideo = false
            } else {
                e.mCanvasElement = null
            }
            e.mIsActive = true
        };
        var t = window.URL.createObjectURL(this.mStream);
        this.mVideoElement.src = t
    };
    e.prototype.TryGetFrame = function() {
        var e = this.mBufferedFrame;
        this.mBufferedFrame = null;
        return e
    };
    e.prototype.SetMute = function(e) {
        this.mVideoElement.muted = e
    };
    e.prototype.PeekFrame = function() {
        return this.mBufferedFrame
    };
    e.prototype.Update = function() {
        if (this.mIsActive && this.mHasVideo && this.mCanvasElement != null) {
            var e = (new Date).getTime();
            var t = e - this.mLastFrame;
            if (t >= this.mMsPerFrame) {
                this.mLastFrame = e;
                this.FrameToBuffer()
            }
        }
    };
    e.prototype.Dispose = function() {
        this.mIsActive = false;
        if (this.mCanvasElement != null && this.mCanvasElement.parentElement != null) {
            this.mCanvasElement.parentElement.removeChild(this.mCanvasElement)
        }
        if (this.mVideoElement != null && this.mVideoElement.parentElement != null) {
            this.mVideoElement.parentElement.removeChild(this.mVideoElement)
        }
        var e = this.mStream.getVideoTracks();
        for (var t = 0; t < e.length; t++) {
            e[t].stop()
        }
        var n = this.mStream.getAudioTracks();
        for (var t = 0; t < n.length; t++) {
            n[t].stop()
        }
        this.mStream = null;
        this.mVideoElement = null;
        this.mCanvasElement = null
    };
    e.prototype.CreateFrame = function() {
        var e = this.mCanvasElement.getContext("2d");
        var t = true;
        if (t) {
            e.clearRect(0, 0, this.mCanvasElement.width, this.mCanvasElement.height)
        }
        e.drawImage(this.mVideoElement, 0, 0);
        try {
            var n = e.getImageData(0, 0, this.mCanvasElement.width, this.mCanvasElement.height);
            var i = n.data;
            var r = new Uint8Array(i.buffer);
            return new RawFrame(r, this.mCanvasElement.width, this.mCanvasElement.height)
        } catch (e) {FrameBuffer
            var r = new Uint8Array(this.mCanvasElement.width * this.mCanvasElement.height * 4);
            r.fill(255, 0, r.length - 1);
            return new RawFrame(r, this.mCanvasElement.width, this.mCanvasElement.height)
        }
    };
    e.prototype.FrameToBuffer = function() {
        if (e.sUseLazyFrames) {
            this.mBufferedFrame = new LazyFrame(this);
        } else {
            try {
                this.mBufferedFrame = this.CreateFrame()
            } catch (e) {
                this.mBufferedFrame = null;
                console.warn("frame skipped due to exception: " + JSON.stringify(e))
            }
        }
    };
    e.prototype.SetupVideoElement = function() {
        var t = document.createElement("video");
        t.width = 320;
        t.height = 240;
        t.controls = true;
        if (e.DEBUG_SHOW_ELEMENTS) document.body.appendChild(t);
        return t
    };
    e.prototype.SetupCanvas = function() {
        if (this.mVideoElement == null || this.mVideoElement.videoWidth <= 0 || this.mVideoElement.videoHeight <= 0) return null;
        var t = document.createElement("canvas");
        t.width = this.mVideoElement.videoWidth;
        t.height = this.mVideoElement.videoHeight;
        if (e.DEBUG_SHOW_ELEMENTS) document.body.appendChild(t);
        return t
    };
    e.prototype.SetVolume = function(e) {
        if (this.mVideoElement == null) {
            return
        }
        if (e < 0) e = 0;
        if (e > 1) e = 1;
        this.mVideoElement.volume = e
    };
    e.prototype.HasAudioTrack = function() {
        if (this.mStream != null && this.mStream.getAudioTracks() != null && this.mStream.getAudioTracks().length > 0) {
            return true
        }
        return false
    };
    e.prototype.HasVideoTrack = function() {
        if (this.mStream != null && this.mStream.getVideoTracks() != null && this.mStream.getVideoTracks().length > 0) {
            return true
        }
        return false
    };
    e.DEBUG_SHOW_ELEMENTS = false;
    e.sUseLazyFrames = false;
    return e
}();

var IFrameData = function() {
    function e() {}
    Object.defineProperty(e.prototype, "Buffer", {
        get: function() {
            return null
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "Width", {
        get: function() {
            return -1
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(e.prototype, "Height", {
        get: function() {
            return -1
        },
        enumerable: true,
        configurable: true
    });
    return e
}();
var RawFrame = function(e) {
    __extends(t, e);

    function t(t, n, i) {
        e.call(this);
        this.mBuffer = null;
        this.mBuffer = t;
        this.mWidth = n;
        this.mHeight = i
    }
    Object.defineProperty(t.prototype, "Buffer", {
        get: function() {
            return this.mBuffer
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "Width", {
        get: function() {
            return this.mWidth
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "Height", {
        get: function() {
            return this.mHeight
        },
        enumerable: true,
        configurable: true
    });
    return t
}(IFrameData);
var LazyFrame = function(e) {
    __extends(t, e);

    function t(t) {
        e.call(this);
        this.mFrameGenerator = t
    }
    Object.defineProperty(t.prototype, "FrameGenerator", {
        get: function() {
            return this.mFrameGenerator
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "Buffer", {
        get: function() {
            this.GenerateFrame();
            if (this.mRawFrame == null) return null;
            return this.mRawFrame.Buffer
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "Width", {
        get: function() {
            this.GenerateFrame();
            if (this.mRawFrame == null) return -1;
            return this.mRawFrame.Width
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(t.prototype, "Height", {
        get: function() {
            this.GenerateFrame();
            if (this.mRawFrame == null) return -1;
            return this.mRawFrame.Height
        },
        enumerable: true,
        configurable: true
    });
    t.prototype.GenerateFrame = function() {
        if (this.mRawFrame == null) {
            try {
                this.mRawFrame = this.mFrameGenerator.CreateFrame()
            } catch (e) {
                this.mRawFrame = null;
                console.warn("frame skipped in GenerateFrame due to exception: " + JSON.stringify(e))
            }
        }
    };
    return t
}(IFrameData);

var MediaPeer = function(e) {
    __extends(t, e);

    function t() {
        e.apply(this, arguments);
        this.mBuffer = null
    }
    t.prototype.OnSetup = function() {
        var t = this;
        e.prototype.OnSetup.call(this);
        this.mOfferOptions = {
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1
        };
        this.mPeer.onaddstream = function(e) {
            t.OnAddStream(e)
        }
    };
    t.prototype.OnCleanup = function() {
        e.prototype.OnCleanup.call(this);
        if (this.mBuffer != null) {
            this.mBuffer.Dispose();
            this.mBuffer = null;
            console.log("MediaPeer buffer disposed")
        }
    };
    t.prototype.OnAddStream = function(e) {
        this.mBuffer = new FrameBuffer(e.stream)
    };
    t.prototype.TryGetRemoteFrame = function() {
        if (this.mBuffer == null) return null;
        return this.mBuffer.TryGetFrame()
    };
    t.prototype.PeekFrame = function() {
        if (this.mBuffer == null) return null;
        return this.mBuffer.PeekFrame()
    };
    t.prototype.AddLocalStream = function(e) {
        this.mPeer.addStream(e)
    };
    t.prototype.Update = function() {
        e.prototype.Update.call(this);
        if (this.mBuffer != null) {
            this.mBuffer.Update()
        }
    };
    t.prototype.SetVolume = function(e) {
        if (this.mBuffer != null) this.mBuffer.SetVolume(e)
    };
    t.prototype.HasAudioTrack = function() {
        if (this.mBuffer != null) return this.mBuffer.HasAudioTrack();
        return false
    };
    t.prototype.HasVideoTrack = function() {
        if (this.mBuffer != null) return this.mBuffer.HasVideoTrack();
        return false
    };
    return t
}(WebRtcDataPeer);

var Encoder = function() {
    function e() {}
    return e
}();
var UTF16Encoding = function(e) {
    __extends(t, e);

    function t() {
        e.call(this)
    }
    t.prototype.GetBytes = function(e) {
        return this.stringToBuffer(e)
    };
    t.prototype.GetString = function(e) {
        return this.bufferToString(e)
    };
    t.prototype.bufferToString = function(e) {
        var t = new Uint16Array(e.buffer, e.byteOffset, e.byteLength / 2);
        return String.fromCharCode.apply(null, t)
    };
    t.prototype.stringToBuffer = function(e) {
        var t = new ArrayBuffer(e.length * 2);
        var n = new Uint16Array(t);
        for (var i = 0, r = e.length; i < r; i++) {
            n[i] = e.charCodeAt(i)
        }
        var o = new Uint8Array(t);
        return o
    };
    return t
}(Encoder);
var Encoding = function() {
    function e() {}
    Object.defineProperty(e, "UTF16", {
        get: function() {
            return new UTF16Encoding
        },
        enumerable: true,
        configurable: true
    });
    return e
}();

/*webrtcnetwork*/

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

/*netevent*/

var NetEventType;
(function (NetEventType) {
    NetEventType[NetEventType["Invalid"] = 0] = "Invalid";
    NetEventType[NetEventType["UnreliableMessageReceived"] = 1] = "UnreliableMessageReceived";
    NetEventType[NetEventType["ReliableMessageReceived"] = 2] = "ReliableMessageReceived";
    NetEventType[NetEventType["ServerInitialized"] = 3] = "ServerInitialized";
    NetEventType[NetEventType["ServerInitFailed"] = 4] = "ServerInitFailed";
    NetEventType[NetEventType["ServerClosed"] = 5] = "ServerClosed";
    NetEventType[NetEventType["NewConnection"] = 6] = "NewConnection";
    NetEventType[NetEventType["ConnectionFailed"] = 7] = "ConnectionFailed";
    NetEventType[NetEventType["Disconnected"] = 8] = "Disconnected";
    NetEventType[NetEventType["FatalError"] = 100] = "FatalError";
    NetEventType[NetEventType["Warning"] = 101] = "Warning";
    NetEventType[NetEventType["Log"] = 102] = "Log"; //not yet used
})(NetEventType || (NetEventType = {}));

var NetEventDataType;
(function (NetEventDataType) {
    NetEventDataType[NetEventDataType["Null"] = 0] = "Null";
    NetEventDataType[NetEventDataType["ByteArray"] = 1] = "ByteArray";
    NetEventDataType[NetEventDataType["UTF16String"] = 2] = "UTF16String";
})(NetEventDataType || (NetEventDataType = {}));

var NetworkEvent = (function () {
    function NetworkEvent(t, conId, data) {
        this.type = t;
        this.connectionId = conId;
        this.data = data;
    }
    Object.defineProperty(NetworkEvent.prototype, "RawData", {
        get: function () {
            return this.data;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NetworkEvent.prototype, "MessageData", {
        get: function () {
            if (typeof this.data != "string")
                return this.data;
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NetworkEvent.prototype, "Info", {
        get: function () {
            if (typeof this.data == "string")
                return this.data;
            return null;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NetworkEvent.prototype, "Type", {
        get: function () {
            return this.type;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NetworkEvent.prototype, "ConnectionId", {
        get: function () {
            return this.connectionId;
        },
        enumerable: true,
        configurable: true
    });
    //for debugging only
    NetworkEvent.prototype.toString = function () {
        var output = "NetworkEvent[";
        output += "NetEventType: (";
        output += NetEventType[this.type];
        output += "), id: (";
        output += this.connectionId.id;
        output += "), Data: (";
        if (typeof this.data == "string") {
            output += this.data;
        }
        output += ")]";
        return output;
    };
    NetworkEvent.parseFromString = function (str) {
        var values = JSON.parse(str);
        var data;
        if (values.data == null) {
            data = null;
        }
        else if (typeof values.data == "string") {
            data = values.data;
        }
        else if (typeof values.data == "object") {
            //json represents the array as an object containing each index and the
            //value as string number ... improve that later
            var arrayAsObject = values.data;
            var length = 0;
            for (var prop in arrayAsObject) {
                //if (arrayAsObject.hasOwnProperty(prop)) { //shouldnt be needed
                length++;
            }
            var buffer = new Uint8Array(Object.keys(arrayAsObject).length);
            for (var i = 0; i < buffer.length; i++)
                buffer[i] = arrayAsObject[i];
            data = buffer;
        }
        else {
            console.error("data can't be parsed");
        }
        var evt = new NetworkEvent(values.type, values.connectionId, data);
        return evt;
    };
    NetworkEvent.toString = function (evt) {
        return JSON.stringify(evt);
    };
    NetworkEvent.fromByteArray = function (arr) {
        var type = arr[0]; //byte
        var dataType = arr[1]; //byte
        var id = new Int16Array(arr.buffer, arr.byteOffset + 2, 1)[0]; //short
        var data = null;
        if (dataType == NetEventDataType.ByteArray) {
            var length_1 = new Uint32Array(arr.buffer, arr.byteOffset + 4, 1)[0]; //uint
            var byteArray = new Uint8Array(arr.buffer, arr.byteOffset + 8, length_1);
            data = byteArray;
        }
        else if (dataType == NetEventDataType.UTF16String) {
            var length_2 = new Uint32Array(arr.buffer, arr.byteOffset + 4, 1)[0]; //uint
            var uint16Arr = new Uint16Array(arr.buffer, arr.byteOffset + 8, length_2);
            var str = "";
            for (var i = 0; i < uint16Arr.length; i++) {
                str += String.fromCharCode(uint16Arr[i]);
            }
            data = str;
        }
        var conId = new ConnectionId(id);
        var result = new NetworkEvent(type, conId, data);
        return result;
    };
    NetworkEvent.toByteArray = function (evt) {
        var dataType;
        var length = 4; //4 bytes are always needed
        //getting type and length
        if (evt.data == null) {
            dataType = NetEventDataType.Null;
        }
        else if (typeof evt.data == "string") {
            dataType = NetEventDataType.UTF16String;
            var str = evt.data;
            length += str.length * 2 + 4;
        }
        else {
            dataType = NetEventDataType.ByteArray;
            var byteArray = evt.data;
            length += 4 + byteArray.length;
        }
        //creating the byte array
        var result = new Uint8Array(length);
        result[0] = evt.type;
        ;
        result[1] = dataType;
        var conIdField = new Int16Array(result.buffer, result.byteOffset + 2, 1);
        conIdField[0] = evt.connectionId.id;
        if (dataType == NetEventDataType.ByteArray) {
            var byteArray = evt.data;
            var lengthField = new Uint32Array(result.buffer, result.byteOffset + 4, 1);
            lengthField[0] = byteArray.length;
            for (var i = 0; i < byteArray.length; i++) {
                result[8 + i] = byteArray[i];
            }
        }
        else if (dataType == NetEventDataType.UTF16String) {
            var str = evt.data;
            var lengthField = new Uint32Array(result.buffer, result.byteOffset + 4, 1);
            lengthField[0] = str.length;
            var dataField = new Uint16Array(result.buffer, result.byteOffset + 8, str.length);
            for (var i = 0; i < dataField.length; i++) {
                dataField[i] = str.charCodeAt(i);
            }
        }
        return result;
    };
    return NetworkEvent;
}());

var ConnectionId = (function () {
    function ConnectionId(nid) {
        this.id = nid;
    }
    ConnectionId.INVALID = new ConnectionId(-1);
    return ConnectionId;
}());
