// This will use the demo backend if you open index.html locally via file://, otherwise your server will be used
//let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;
let backendUrl = "https://tiktok-chat-reader.zerody.one/";
let connection = new TikTokIOConnection(backendUrl);
const formatTime = (format = "", num = new Date().getTime()) => {
	format = format || "YYYY-mm-dd HH:MM:SS"; //第一个参数不填时，使用默认格式
	let ret, date, renum;
	// 处理时间戳，js一般获取的时间戳是13位，PHP一般是10位,根据实际情况做判断处理
	date = new Date(parseInt(num.toString().length === 10 ? num * 1000 : num));
	const opt = {
		Y: date.getFullYear().toString(), // 年
		m: (date.getMonth() + 1).toString(), // 月
		d: date.getDate().toString(), // 日
		H: date.getHours().toString(), // 时
		M: date.getMinutes().toString(), // 分
		S: date.getSeconds().toString(), // 秒
		// 目前用的是这六种符号,有其他格式化字符需求可以继续添加，值必须转化成字符串
	};
	for (var k in opt) {
		ret = new RegExp("(" + k + "+)").exec(format);
		if (ret) {
			renum = ret[1].length == 1 ? opt[k] : opt[k].padStart(ret[1].length, "0"); //根据复数前面是否补零,如“mm”补零，单“m”前面不补零
			format = format.replace(ret[1], renum); //替换
		}
	}
	return format;
};
let leaderboardText;
let contributions;
let 主播ID;
let nowTime = Date.now();
let Daynow = formatTime("mm月dd日", nowTime);
let GiftDay = Daynow + "直播统计";
let 直播统计;
let Giftname;
// Counter
let viewerCount = 0;
let mostviewerCount = 0;
let likeCount = 0;
let newfansCount = 0;
let diamondsCount = 0;
let isDragging = false;
let isScrolling = false;
// These settings are defined by obs.html
if (!window.settings)
	window.settings = {
		showJoins: "1",
		showLikes: "1",
		showChats: "1",
		showFollows: "1",
		showGifts: "1",
	};
const setDraggingAndScrolling = (
	container,
	isDragging,
	isScrolling,
	timeout
) => {
	container
		.on("mousedown", function() {
			isDragging = true;
		})
		.on("mouseup", function() {
			isDragging = false;
			setTimeout(function() {
				isScrolling = false;
			}, timeout);
		})
		.on("scroll", function() {
			if (isDragging) {
				isScrolling = true;
				console.log("scroll");
				setTimeout(function() {
					if (!isDragging) {
						isScrolling = false;
					}
				}, timeout);
			}
		});
};
// 定义函数来获取最新的贡献者名字和数量的内容
function getTopThreeContributors() {
		const topThreeContributors = Object.entries(contributions).slice(0, 3).map(([key, value], index) => {
			const name = value[0].名字;
			const quantity = value[0].数量;
			const color = getColor(index);
			const fontSize = getFontSize(index);
			return `<span style="color: ${color}; font-size: ${fontSize}">${name}(${quantity}💎)</span>`;
		});
		return topThreeContributors;
	}
	// 辅助函数来生成不同的颜色和字体大小

function getColor(index) {
	const colors = ["red", "blue", "green"]; // 替换为你想要的颜色
	return colors[index] || "black";
}

function getFontSize(index) {
	const fontSizes = ["24px", "20px", "16px"]; // 替换为你想要的字体大小
	return fontSizes[index] || "16px";
}


$(document).ready(() => {
	leaderboardText = document.getElementById("LeaderboardText");
	$("#connectButton").click(connect);
	$("#uniqueIdInput").on("keyup", function(e) {
		if (e.key === "Enter") {
			connect();
		}
	});
	$(".chatcontainer, .giftcontainer, .eventcontainer")
		.mousedown(function() {
			isDragging = true;
		})
		.mouseup(function() {
			isDragging = false;
			setTimeout(function() {
				isScrolling = false;
			}, 500);
		})
		.scroll(function() {
			if (isDragging) {
				isScrolling = true;
				setTimeout(function() {
					if (!isDragging) {
						isScrolling = false;
					}
				}, 500);
			}
		});
	if (window.settings.username) connect();
});

function connect() {
		let uniqueId = window.settings.username || $("#uniqueIdInput").val();
		if (uniqueId !== "") {
			主播ID = uniqueId;
			直播统计 = JSON.parse(localStorage.getItem(GiftDay)) || {};
			直播统计[主播ID] = 直播统计[主播ID] || {
				共获得钻石: 0,
				新增粉丝: 0,
				观众峰值: 0,
				钻石贡献: {},
			};
			contributions = 直播统计[主播ID]["钻石贡献"];
			viewerCount = 0;
			likeCount = 0;
			diamondsCount = 直播统计[主播ID]["共获得钻石"];
			localStorage.setItem(GiftDay, JSON.stringify(直播统计));
			$("#stateText").text("连接中...");
			connection
				.connect(uniqueId, {
					enableExtendedGiftInfo: false,
					clientParams: {
						app_language: "zh-CN",
					},
				})
				.then((state) => {
					$("#stateText").text(`已连接到房间ID ${state.roomId}`);
					// reset stats
					updateRoomStats();
				})
				.catch((errorMessage) => {
					$("#stateText").text(errorMessage);
					// schedule next try if obs username set
					if (window.settings.username) {
						setTimeout(() => {
							connect(window.settings.username);
						}, 30000);
					}
				});
		} else {
			alert("no username entered");
		}
	}
	// Prevent Cross site scripting (XSS)

function sanitize(text) {
	if (typeof text !== "undefined") {
		text = text.replace(/</g, "&lt;");
	}
	return text;
}

function updateRoomStats() {
	$("#roomStats").html(
		`新增粉丝: <b><span style="color: purple;">${newfansCount.toLocaleString()}</span></b> 观众: <b>${viewerCount.toLocaleString()}</b> 点赞: <b><span style="color: red;">${likeCount.toLocaleString()}</span></b> 共获得钻石: <b><span style="color: blue;">${diamondsCount.toLocaleString()}</span></b>`
	);
	if (viewerCount > mostviewerCount) {
		mostviewerCount = 直播统计[主播ID]["观众峰值"] = viewerCount;
		localStorage.setItem(GiftDay, JSON.stringify(直播统计));
	}
}

function generateUsernameLink(data) {
	return `<a class="usernamelink" href="https://www.tiktok.com/@${data.uniqueId}" target="_blank">${data.nickname}</a>`; // (${data.uniqueId})
}

function isPendingStreak(data) {
		return data.giftType === 1 && !data.repeatEnd;
	}
	/**
	 * Add a new message to the chat container
	 */

function addChatItem(color, data, text, summarize) {
		let container = location.href.includes("obs.html") ? $(".eventcontainer") : $(".chatcontainer");
		if (container.find("div").length > 50000) {
			container.find("div").slice(0, 200).remove();
		}
		container.find(".temporary").remove();
		let LocalTime =
			data.createTime > 0 ? formatTime("HH:MM:SS", data.createTime) : "";
		container.append(`
    <div class=${summarize ? "temporary" : "static"}>
        <span>
            <b>[${LocalTime}]</b>
            <img class="miniprofilepicture" src="${data.profilePictureUrl}">
            ${generateUsernameLink(data)}:
            <span style="color:${color}">${sanitize(text)}</span>
        </span>
    </div>
	`);
		if (!isScrolling) {
			container.stop();
			container.animate({
					scrollTop: container[0].scrollHeight,
				},
				500
			);
		}
	}
	/**
	 * Add a new gift to the gift container
	 */

function addGiftItem(data) {
		let container = location.href.includes("obs.html") ? $(".eventcontainer") : $(".giftcontainer");
		/*if (container.find('div').length > 2000) {
							  container.find('div').slice(0, 100).remove();
						  }*/
		let streakId = data.userId.toString() + "_" + data.giftId;
		let html = `
        <div data-streakid=${isPendingStreak(data) ? streakId : ""}>
            <img class="miniprofilepicture" src="${data.profilePictureUrl}">
            <span>
                <b>${formatTime("HH:MM:SS", data.createTime)} ${generateUsernameLink(data)}</b><span></span>送出了<br>
                <div>
                    <table>
                        <tr>
                            <td><img class="gifticon" src="${data.giftPictureUrl}"></td>
                            <td>
                                <span>礼物: <b><span style="color: red">${Giftname}</span></b><span style="color: white"> (礼物ID:${data.giftId})</span><span><br>
                                <span>数量: <b style="${isPendingStreak(data) ? "color:red" : ""}">x${data.repeatCount.toLocaleString()}</b><span><br>
                                <span>价值: <b>${(data.diamondCount * data.repeatCount).toLocaleString()} 钻石</b><span>
                            </td>
                        </tr>
                    </table>
                </div>
            </span>
        </div>
    `;
		let existingStreakItem = container.find(`[data-streakid='${streakId}']`);
		if (existingStreakItem.length) {
			existingStreakItem.replaceWith(html);
		} else {
			container.append(html);
		}
		if (!isScrolling) {
			container.stop();
			container.animate({
					scrollTop: container[0].scrollHeight,
				},
				500
			);
		}
	}
	// liveIntro
connection.on("liveIntro", (msg) => {
	//addChatItem('#447dd4', msg, '当前粉丝数量: ' + msg.followInfo.followerCount)
	addChatItem("#ff005e", msg, msg.description);
});
// viewer stats
connection.on("roomUser", (msg) => {
	if (typeof msg.viewerCount === "number") {
		viewerCount = msg.viewerCount;
		updateRoomStats();
	}
});
// like stats
connection.on("like", (msg) => {
	if (typeof msg.totalLikeCount === "number") {
		likeCount = msg.totalLikeCount;
	}
	updateRoomStats();
	if (window.settings.showLikes === "0") return;
	if (typeof msg.likeCount === "number") {
		addChatItem("#447dd4", msg, " 赞了直播", true);
	}
});
// Member join
let joinMsgDelay = 0;
connection.on("member", (msg) => {
	if (window.settings.showJoins === "0") return;
	let addDelay = 250;
	if (joinMsgDelay > 500) addDelay = 100;
	if (joinMsgDelay > 1000) addDelay = 0;
	joinMsgDelay += addDelay;
	setTimeout(() => {
		joinMsgDelay -= addDelay;
		addChatItem("#21b2c2", msg, "进入直播间", true);
	}, joinMsgDelay);
});
// New chat comment received
connection.on("chat", (msg) => {
	if (window.settings.showChats === "0") return;
	addChatItem("", msg, msg.comment);
});
// New gift received
connection.on("gift", (data) => {
	let targetGift = gifts.gifts.find((gift) => gift.id === Number(data.giftId));
	if (targetGift) {
		Giftname = targetGift.name;
	} else {
		console.log(data.giftName);
		Giftname = data.giftName;
	}
	if (!isPendingStreak(data) && data.diamondCount > 0) {
		直播统计 = JSON.parse(localStorage.getItem(GiftDay));
		直播统计[主播ID]["礼物"] = 直播统计[主播ID]["礼物"] || {};
		直播统计[主播ID]["礼物"][Giftname] = 直播统计[主播ID]["礼物"][Giftname] || {};
		直播统计[主播ID]["礼物"][Giftname]["统计"] = 直播统计[主播ID]["礼物"][Giftname]["统计"] || [{
			单价: 0,
			数量: 0
		}];
		直播统计[主播ID]["礼物"][Giftname][data.uniqueId] = 直播统计[主播ID]["礼物"][Giftname][data.uniqueId] || [{
			名字: data.nickname,
			数量: 0
		}];
		直播统计[主播ID]["礼物"][Giftname][data.uniqueId][0]["数量"] += data.repeatCount;
		直播统计[主播ID]["礼物"][Giftname]["统计"][0]["单价"] = data.diamondCount
		直播统计[主播ID]["礼物"][Giftname]["统计"][0]["数量"] += data.repeatCount
		直播统计[主播ID]["钻石贡献"][data.uniqueId] = 直播统计[主播ID]["钻石贡献"][data.uniqueId] || [{
			名字: data.nickname,
			数量: 0
		}];
		直播统计[主播ID]["钻石贡献"][data.uniqueId][0]["数量"] += (data.diamondCount * data.repeatCount);
		diamondsCount += data.diamondCount * data.repeatCount;
		直播统计[主播ID]["共获得钻石"] = diamondsCount;
		let sortByQuantity = (group) => {
			const sortedGroup = {};
			Object.keys(group)
				.sort((a, b) => group[b][0]["数量"] - group[a][0]["数量"])
				.forEach((key) => {
					sortedGroup[key] = group[key];
				});
			return sortedGroup;
		};
		直播统计[主播ID]["钻石贡献"] = sortByQuantity(直播统计[主播ID]["钻石贡献"]);
		直播统计[主播ID]["礼物"][Giftname] = sortByQuantity(直播统计[主播ID]["礼物"][Giftname]);
		localStorage.setItem(GiftDay, JSON.stringify(直播统计));
		contributions = 直播统计[主播ID]["钻石贡献"];
		leaderboardText.innerHTML = getTopThreeContributors().join("	");
		updateRoomStats();
	}
	if (window.settings.showGifts === "0") return;
	addGiftItem(data);
});
// share, follow
connection.on("social", (data) => {
	if (window.settings.showFollows === "0") return;
	let color;
	let msg;
	if (data.displayType.includes("follow")) {
		color = "#ff005e";
		msg = "已关注主播";
		直播统计 = JSON.parse(localStorage.getItem(GiftDay));
		newfansCount = ++直播统计[主播ID]["新增粉丝"];
		localStorage.setItem(GiftDay, JSON.stringify(直播统计));
		updateRoomStats();
	} else {
		color = "#2fb816";
		msg = "已分享直播间";
	}
	addChatItem(color, data, msg, true);
});
connection.on("streamEnd", () => {
	$("#stateText").text("直播已结束.");
	// schedule next try if obs username set
	if (window.settings.username) {
		setTimeout(() => {
			connect(window.settings.username);
		}, 30000);
	}
});