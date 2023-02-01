
//clip-path   https://juejin.cn/post/7023310084860182558
// motion path https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Motion_Path
// svg         https://blog.csdn.net/dusea/article/details/49493503
// html to image https://github.com/tsayen/dom-to-image



function getPolygon(element) {
return new Promise((resolve) => {
	domtoimage.toPng(element).then(function(dataUrl) {
        let img = new Image()
		img.onload = function() {
			let pots = parseImg(img)
			debugPots(img.width, img.height, pots)
			pots = makeLine(pots)
			//console.log(pots)
			pots = shrinkPots(pots)
			resolve(pots)

		}
        img.src = dataUrl
	}) 
})
}

function getPolygonStr(pots) {
	function formatPos(input) {
		if (input) return input + 'px'
		else return 0
	}
	let strList = pots.map( pot => `${formatPos(pot[1])} ${formatPos(pot[0])}`)
	return 'polygon(' + strList.join(',') + ')'
}
function enableDebug() {
	return document.getElementById('debugChk').checked
}


function debugPots(w, h, pots) {
	if (!enableDebug()) return
	let potMap = {}
	pots.forEach((pot, i) => {
		let [m, n] = pot
		potMap[`${m}:${n}`] = i 
	})
	let html = ''
	for(let i = 0; i < h; i++) {
		html += '<div class=tr>'
		for(let j = 0; j < w; j++) {
			let t = `${i}:${j}`
			html += `<div id=${t} class="td ${t in potMap? 'true': ''}" title="${ t in potMap?t : ''}"> </div>`
		}
		html += '</div>'
	}
	html += ''
	document.getElementById('debug').innerHTML = html
}

function parseImg(img) {
	let canvas = document.createElement('canvas')
	let ctx = canvas.getContext('2d')
	let w = img.width
	let h = img.height
	canvas.width = w 
	canvas.height = h 
	ctx.drawImage(img, 0, 0)
	let imgData = ctx.getImageData(0,0, w, h)
	let imgDataList = imgData.data
	let imgDataListClone = imgDataList.slice() 
	let pots = []
	let linePots = []

	//极值化
	for (let m = 0; m < h; m++){
		for (let n = 0; n < w; n++) {
			let oneDimensonIndex = (m * w + n)
			let i = oneDimensonIndex * 4
			//不是透明的
			let isColorSpot = imgDataList[ i + 3 ] > 0 
			if (isColorSpot) {
				pots.push(oneDimensonIndex)
				imgDataList[i] = imgDataList[i+1] = imgDataList[i+2] = 0
			}
		}
	}

	function getMNfromIndex(index) {
		let n  = index % w 
		let m = (index - n ) /w 
		return [m, n]

	}
	// 所有颜色点 向八个方向检查 如果都是颜色点 抠白
	for (let x = 0; x < pots.length; x++){
		let oneDimensonIndex = pots[x]
		let [m, n] = getMNfromIndex(oneDimensonIndex)
		let checkPots = []	
		if (n < w - 1) checkPots.push(m * w + n + 1)
		if (n > 1) checkPots.push(m * w + n - 1)
		if (m < h) {
			checkPots.push(w * (m + 1) + n)
			if (n < w -1) checkPots.push( w * (m + 1) + n + 1)
			if (n > 1) checkPots.push(w * (m + 1) + n - 1)
		}
		if (m > 1) {
			checkPots.push(w * (m - 1) + n)
			if (n < w -1 ) checkPots.push(w * (m - 1) + n + 1)
			if (n > 1) checkPots.push(w * (m - 1) + n - 1)
		}
		let isInnerPot = checkPots.length == 8 &&  checkPots.every( v => pots.includes(v))

		if (isInnerPot) {
			let i = oneDimensonIndex * 4
			imgDataList[i+3] = 0
		} else {
			linePots.push([m, n])
		}

	}

	ctx.putImageData(imgData, 0, 0)
    document.body.appendChild(canvas)	
	return linePots
} 

//去掉中间连续的点
function shrinkPots(pots) {
	for (let x = pots.length - 1; x >=0; x--) {
		let [m, n] = pots[x]

		if (pots[x-1] && pots[x+1]) {
			let [m1, n1] = pots[x-1]
			let [m2, n2] = pots[x+1]
			let delta1 = (n - n1) / (m - m1)
			let delta2 = (n2 - n) / (m2 - m)
			if (delta1 == delta2) {
				pots.splice(x, 1)
			}
		}
	}	
	return pots
}

// 连线
function makeLine(pots) {
	let potMap = {}
	let newLine = []
	pots.forEach((pot, i) => {
		let [m, n] = pot
		potMap[`${m}:${n}`] = i 
	})

	let debugEnabled = enableDebug()

	function pickPotIfExists(m , n) {
		let t = `${m}:${n}`
		if (t in potMap) {
			if (debugEnabled) {
				document.getElementById(t).style.background = 'blue'
			}
			let i = potMap[t]
			let pot = pots[i]
			pots.splice(i , 1)
			delete potMap[t]
			return true 
		}

	}
	function getNearest(pot) {
		let [m, n] = pot

		let nearestPot = [
			[m - 1, n],
			[m - 1, n + 1],
			[m, n + 1],
			[m + 1, n + 1],
			[m + 1, n ],
			[m + 1, n -1 ],
			[m, n -1 ],
			[m - 1, n -1 ],

		].find(pos => pickPotIfExists(pos[0], pos[1]))

		return nearestPot
	}

	let startPot = pots[0]

	let lastPot = startPot
	let maxStepCount = pots.length + 100 
	while (true && maxStepCount--) {
		if (!lastPot) break
		newLine.push(lastPot)
		let nextLastPot = getNearest(lastPot)
		if (!nextLastPot) {
			//避免墨块
			newLine.pop()
			lastPot = newLine[newLine.length - 1] 
			nextLastPot = getNearest(lastPot)

		}
		lastPot = nextLastPot
		if (
			newLine.length > 2 && 
			lastPot && 
			lastPot[0] == startPot[0] && lastPot[1] == startPot[1] 
		) {
			// 闭合了
			console.log('success')
			break
		}

	}
	// console.log(pots)
	// console.log(newLine.length, newLine)
	return newLine 
}

function alignPolygon(pots1, pots2) {
	function fillPadding(list, count) {
		let toClone = list.slice(-1)[0]
		let padding = Array(count).fill(toClone)
		return list.concat(padding)
	}

	let gap = pots1.length - pots2.length
	if (gap > 0) pots2 = fillPadding(pots2, gap)
	else if (gap < 0) pots1 = fillPadding(pots1, -gap)
	return [pots1, pots2]
}
