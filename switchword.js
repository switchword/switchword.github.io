//array filters
const common = (array) => (value => array.indexOf(value) >= 0);
const equal = (array) => ((value, index) => value === array[index]);
//remember 'array' here is potentially spliced!!! so, slice it before passing it to this function
const bagDiff = (array) => function(value) { const pos = array.indexOf(value); return pos < 0 || array.splice(pos, 1) && false;};
//returns Object with reduce method (with {} or other starting object as last arg)
const toObjectSet = (constant) => ((previous, next) => Object.assign(previous, {[next]: constant}));
//general helper expressions
const random = (range) => Math.floor(Math.random() * range);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function gamelenPressed(lenStr, el, m, words, maxWordLen, byteArray, lm, dm, tr)
{
	const newWordLen = parseInt(lenStr);
	if (m.wordLen !== newWordLen)
	{
		m.wordLen = newWordLen;
		localStorage.setItem("wordLen", m.wordLen);
		if (m.sortedLetters[m.wordLen] === 0)
		{
			resetNextWordData(byteArray, m, lm[m.lang].alphabet.length, dm, tr, el);
			wait(1).then(() => {
				newGame(el, m, words, maxWordLen, lm, byteArray, dm.dictStartPos[m.wordLen], dm.dictLen[m.wordLen], dm.freqSet[m.wordLen]);
			});
			return;
		}
	}
	newGame(el, m, words, maxWordLen, lm, byteArray, dm.dictStartPos[m.wordLen], dm.dictLen[m.wordLen], dm.freqSet[m.wordLen]);
}

function backspacePressed(repeatEvent, el, m, words, maxWordLen)
{
	function eraseOneLetter(el, words, m, wordLen, curLine)
	{
		words[curLine].pop();
		el.letters[curLine][words[curLine].length].textContent = "";
		el.error.textContent = "";
		updateLetters(el, words, m, wordLen, curLine);
		updateErasers(el, words, m.curLine, m.wordLen);
	}
	if (m.curLine === m.wordLen)
		return;
	if (words[m.curLine].length > 0)
		eraseOneLetter(el, words, m, m.wordLen, m.curLine);
	else if (m.curLine > 1 && repeatEvent === false)
	{
		m.addedLetters.pop();
		m.removedLetters.pop();
		m.curLine--;
		updateCurrent(el, words, m, maxWordLen);
		eraseOneLetter(el, words, m, m.wordLen, m.curLine);
		el.a[m.curLine].classList.add("hidden");
		if (document.activeElement !== undefined && document.activeElement !== null)
			document.activeElement.blur();
	}
}

function hasAnagram(word, m, lm, byteArray, dictStartPos)
{
	const wordcc = Int8Array.from(word.map(v => lm[m.lang].alphabet.indexOf(v)));
	const wi = lookupKey(wordcc.slice().sort(), m.wordLen, lm[m.lang].alphabet.length, m);
	if (wi === undefined)
		return false;
	const eq = (iw) => wordcc.every(equal(byteArray.subarray(dictStartPos + iw * m.wordLen, dictStartPos + (iw + 1) * m.wordLen)));
	if (eq(wi))
		return wi;
	else
	{
		const [anagramPos, anagramNext, anagramWI] = m.anagrams[m.wordLen];
		let anagramNextPos = anagramPos[wi];
		while (anagramNextPos > 0)
		{
			if (eq(anagramWI[anagramNextPos]))
				return wi;
			anagramNextPos = anagramNext[anagramNextPos];
		}
	}
	return true;
}

function letterPressed(letter, m, words, el, maxWordLen, lm, byteArray, dictStartPos, tr)
{
	if (letter.length !== 1
	 ||	m.curLine === m.wordLen
	 ||	words[m.curLine].length === m.wordLen
	 ||	el.error.textContent.length !== 0
	 ||	! (m.availableLetters.indexOf(letter) >= 0
		 ||	m.requiredLetters.indexOf(letter) >= 0
		 ||	m.introduceLetters.indexOf(letter) >= 0))
		return;

	el.letters[m.curLine][words[m.curLine].length].textContent = letter;
	words[m.curLine].push(letter);
	updateLetters(el, words, m, m.wordLen, m.curLine);
	updateErasers(el, words, m.curLine, m.wordLen);

	if (words[m.curLine].length !== m.wordLen)
		return;

	const wi = hasAnagram(words[m.curLine], m, lm, byteArray, dictStartPos);
	if (wi === false)
		el.error.textContent = tr[m.lang][m.easyMode ? 'notanag' : 'notword'];
	else if (wi === true)
		el.error.textContent = tr[m.lang][m.easyMode ? 'anagram' : 'notword'];
	else
	{
		if (m.solutions[m.curLine][wi] === undefined)
			el.error.textContent = tr[m.lang]['deadend'];
		else
		{
			m.addedLetters.push(words[m.curLine].filter(bagDiff(words[m.curLine - 1].slice()))[0]);
			m.removedLetters.push(words[m.curLine - 1].filter(bagDiff(words[m.curLine].slice()))[0]);
			setLink(m.curLine, words[m.curLine], el, lm[m.lang].link, lm[m.lang].linktext);
			m.curLine++;
			updateCurrent(el, words, m, maxWordLen);
			if (m.curLine === m.wordLen)
			{
				for (let li = 0; li < m.wordLen; li++)
				{
					el.letters[m.curLine][li].classList.add("win");
					wait(2100).then(() => el.letters[m.curLine][li].classList.remove("win"));
				}
			}
		}
	}
}

function updateLetters(el, words, m, wordLen, curLine)
{
	function refreshLetterLine(wordLine, letterSets, letterClasses, el, wordLen, words)
	{
		const letterList = new Array(wordLen).fill(0);
		for (let iLetterSet = 0; iLetterSet < letterSets.length; iLetterSet++)
			for (let letter of letterSets[iLetterSet])
			{
				let initialPos = 0;
				while (initialPos < wordLen)
				{
					const pos = words[wordLine].indexOf(letter, initialPos);
					if (pos < 0)
						break;
					else if (letterList[pos] === 0)
					{
						letterList[pos] = iLetterSet + 1;
						break;
					}
					initialPos = pos + 1;
				}
			}
		for (let i = 0; i < wordLen; i++)
			el.letters[wordLine][i].className = letterClasses[letterList[i]];
	}
	m.availableLetters = words[0].filter(bagDiff(m.removedLetters.slice(1, curLine).concat(words[curLine])));
	m.requiredLetters = m.addedLetters.filter(bagDiff(words[curLine].slice()));
	m.introduceLetters = words[wordLen].filter(bagDiff(m.addedLetters.slice(1, curLine)));
	const reqCurUsedLs = words[curLine].filter(bagDiff(m.addedLetters.slice(1, curLine)));

	if (m.introduceLetters.some(common(reqCurUsedLs)))
		m.introduceLetters = [];
	if (m.availableLetters.length === 1)
		m.availableLetters = [];

	refreshLetterLine(curLine - 1, [m.requiredLetters, m.availableLetters], ["letter", "letter required", "letter available"], el, wordLen, words);
	refreshLetterLine(wordLen, [m.requiredLetters, m.introduceLetters], ["letter", "letter required", "letter introduce"], el, wordLen, words);
}

function updateErasers(el, words, curLine, wordLen)
{
	if (words[curLine].length === 0 || curLine === wordLen)
	{
		el.backspace.remove();
		el.clearline.remove();
		if (curLine > 1 && curLine < wordLen)
		{
			el.afterWords[curLine - 1].appendChild(el.backspace);
			el.afterWords[curLine - 1].appendChild(el.clearline);
		}
	}
	else if (words[curLine].length === 1)
	{
		el.afterWords[curLine].appendChild(el.backspace);
		el.afterWords[curLine].appendChild(el.clearline);
	}
}

function updateCurrent(el, words, m, maxWordLen)
{
	updateLetters(el, words, m, m.wordLen, m.curLine);
	updateErasers(el, words, m.curLine, m.wordLen);

	el.words[m.prevCurLine].classList.remove("current");
	el.words[m.prevCurLine].previousElementSibling.classList.remove("current");
	el.words[m.prevCurLine].nextElementSibling.classList.remove("current");
	el.words[m.curLine].classList.add("current");
	el.words[m.curLine].previousElementSibling.classList.add("current");
	el.words[m.curLine].nextElementSibling.classList.add("current");
	if (m.prevCurLine > 0)
	{
		el.words[m.prevCurLine - 1].classList.remove("noneditable");
		el.words[m.prevCurLine - 1].previousElementSibling.classList.remove("noneditable");
		el.words[m.prevCurLine - 1].nextElementSibling.classList.remove("noneditable");
	}
	if (m.curLine < m.wordLen)
	{
		el.words[m.curLine - 1].classList.add("noneditable");
		el.words[m.curLine - 1].previousElementSibling.classList.add("noneditable");
		el.words[m.curLine - 1].nextElementSibling.classList.add("noneditable");
	}
	for (let li = 0; li < m.wordLen; li++)
	{
		el.letters[m.curLine][li].classList.remove("available", "required");
		el.letters[m.curLine][li].tabIndex = -1;
		el.letters[m.prevCurLine][li].tabIndex = 0;
	}
	for (let wi = 0; wi < maxWordLen; wi++)
		if (wi <= m.curLine || wi === m.wordLen)
		{
			el.words[wi].classList.remove("hidden");
			el.beforeWords[wi].classList.remove("hidden");
			el.afterWords[wi].classList.remove("hidden");
		}
		else
		{
			el.words[wi].classList.add("hidden");
			el.beforeWords[wi].classList.add("hidden");
			el.afterWords[wi].classList.add("hidden");
		}
	m.prevCurLine = m.curLine;
}

function updateCurLang(m, el, newCurLang)
{
	el.langmenu.children[m.curLang].classList.remove("current");
	m.curLang = newCurLang;
	el.langmenu.children[m.curLang].classList.add("current");
}

function changeLangOrMode(newLang, oldLang, el, m, words, oReq, maxWordLen, tr)
{
	if (newLang === oldLang)
		return changeMode(m, el, (newLang === null) ? m.LANG : m.PLAY);

	updateCurLang(m, el, m.languages.indexOf(newLang));

	m.lang = newLang;
	localStorage.setItem("lang", newLang);

	m.sortedLetters = new Array(maxWordLen).fill(0);
	m.minusLetterCombinations = new Array(maxWordLen).fill(0);
	m.lookupTable = new Array(maxWordLen).fill(0);
	m.anagrams = new Array(maxWordLen).fill(0);
	m.directLinks = new Array(maxWordLen).fill(0);
	m.nextWordList = new Array(maxWordLen).fill(0);

	el.error.textContent = tr[m.lang]['loading'];
	el.help.innerHTML = tr[m.lang]['help'].join("<br>");
	changeMode(m, el, m.PLAY);
	oReq.open("GET", "/dict." + m.lang + ".bin");
	oReq.send();
}

function changeEasy(m, el, words, lm, byteArray, dictStartPos, tr)
{
	if (m.easyMode === true)
	{
		m.easyMode = false;
		el.easy.classList.remove("reallyeasy");
	}
	else
	{
		m.easyMode = true;
		el.easy.classList.add("reallyeasy");
	}
	localStorage.setItem("easyMode", m.easyMode);
	if (words[m.curLine].length === m.wordLen)
	{
		const wi = hasAnagram(words[m.curLine], m, lm, byteArray, dictStartPos);
		if (wi === false)
			el.error.textContent = tr[m.lang][m.easyMode ? 'notanag' : 'notword'];
		else if (wi === true)
			el.error.textContent = tr[m.lang][m.easyMode ? 'anagram' : 'notword'];
	}
}

function changeMode(m, el, newMode)
{
	if (newMode === m.LANG)
	{
		if (m.mode === m.PLAY)
		{
			document.body.appendChild(el.langmenu);
			document.body.removeChild(el.header);
			document.body.removeChild(el.board);
			document.body.removeChild(el.error);
		}
	}
	else if (newMode === m.PLAY)
	{
		if (m.mode === m.LANG)
		{
			document.body.removeChild(el.langmenu);
			document.body.appendChild(el.header);
			document.body.appendChild(el.board);
			document.body.appendChild(el.error);
		}
		else if (m.mode == m.ABOUT)
		{
			document.body.removeChild(el.splash);
			document.body.appendChild(el.header);
			document.body.appendChild(el.board);
			document.body.appendChild(el.error);
		}
	}
	else if (newMode === m.ABOUT)
	{
		if (m.mode === m.PLAY)
		{
			document.body.appendChild(el.splash);
			document.body.removeChild(el.header);
			document.body.removeChild(el.board);
			document.body.removeChild(el.error);
		}
	}
	m.mode = newMode;
}

function setLink(line, word, el, link, linktext)
{
	const sl = link.split("%s");
	el.a[line].href = sl[0] + word.join('') + sl[1];
	el.a[line].textContent = linktext;
	el.a[line].classList.remove("hidden");
}

function newGame(el, m, words, maxWordLen, lm, byteArray, dictStartPos, dictLen, freqs)
{
	const alphabet = lm[m.lang].alphabet;
	let wiFrom;
	let allDestinations = [];
	while (allDestinations.length === 0)
	{
		wiFrom = random(dictLen);
		allDestinations = findDestinations(wiFrom, m, dictLen, m.wordLen, alphabet.length, freqs);
	}
	const wiTo = allDestinations[random(allDestinations.length)];

	const [anagramPos, anagramNext, anagramWI] = m.anagrams[m.wordLen];
	function anagramList(wi)
	{
		const anagrams = [wi];
		let anagramNextPos = anagramPos[wi];
		while (anagramNextPos > 0)
		{
			anagrams.push(anagramWI[anagramNextPos]);
			anagramNextPos = anagramNext[anagramNextPos];
		}
		return anagrams;
	}
	const alTo = anagramList(wiTo);

	const characterCodesFromWordIndex = (wi) => byteArray.subarray(dictStartPos + wi * m.wordLen, dictStartPos + (wi + 1) * m.wordLen);
	words[0] = Array.from(characterCodesFromWordIndex(wiFrom)).map(v => alphabet[v]);
	words[m.wordLen] = Array.from(characterCodesFromWordIndex(alTo[random(alTo.length)])).map(v => alphabet[v]);
	setLink(0, words[0], el, lm[m.lang].link, lm[m.lang].linktext);
	setLink(m.wordLen, words[m.wordLen], el, lm[m.lang].link, lm[m.lang].linktext);

	for (let i = 1; i < m.wordLen; i++)
		words[i] = [];
	m.addedLetters = ['']; //0 index not used, but letters are pushed/poped
	m.removedLetters = ['']; //ditto
	m.curLine = 1;
	m.prevCurLine = 0;
	
	//findSolutions (wiFrom,wiTo)
	m.backwardDistance = m.wordLen >> 1;
	m.forwardDistance = m.backwardDistance + m.wordLen % 2;
	const [ffr, ffrp, ffrc] = findRoutes(m.wordLen, alphabet.length, m, wiFrom, wiTo, m.forwardDistance);
	const [bfr, bfrp, bfrc] = findRoutes(m.wordLen, alphabet.length, m, wiTo, wiFrom, m.backwardDistance);
	const ffrsa = ffr[m.forwardDistance].subarray(0, ffrc[m.forwardDistance]);
	const bfrsa = bfr[m.backwardDistance].subarray(0, bfrc[m.backwardDistance]);
	const commonAtMidpoint = ffrsa.filter(common(bfrsa)).reduce(toObjectSet(1), {});
	if (commonAtMidpoint[-1] !== undefined)
		delete commonAtMidpoint[-1];
	m.solutions = [];
	for (let i = 0; i <= m.wordLen; i++)
		m.solutions[i] = {};
	m.solutions[m.forwardDistance] = commonAtMidpoint;
	findHalfSolutions(m, ffr, ffrp, ffrc, commonAtMidpoint, m.wordLen, m.forwardDistance, true);
	findHalfSolutions(m, bfr, bfrp, bfrc, commonAtMidpoint, m.wordLen, m.backwardDistance, false);

	function findHalfSolutions(m, route, routeParent, routeCount, common, wordLen, distance, forward)
	{
		//eliminate invalid nodes
		for (let ri = 0; ri < routeCount[distance]; ri++)
			if (common[route[distance][ri]] === undefined)
				route[distance][ri] = -1;
		for (let lvl = 0; lvl < distance - 1; lvl++)
		{
			const par = {}
			for (let ri = 0; ri < routeCount[distance - lvl]; ri++)
			{
				const cur = routeParent[distance - lvl][ri];
				const parcur = par[cur];
				if (parcur === undefined || parcur === -1)
					par[cur] = (route[distance - lvl][ri] === -1) ? -1 : cur;

			}
			for (let pli = 0; pli < routeCount[distance - 1 - lvl]; pli++)
				route[distance - 1 - lvl][pli] = par[route[distance - 1 - lvl][pli]];
		}
		//route has only solutions now, ..write them down
		for (let lvl = 0; lvl < distance; lvl++)
		{
			const solutionLevel = forward ? lvl : wordLen - lvl;
			for (let ri = 0; ri < routeCount[lvl]; ri++)
				if (route[lvl][ri] !== -1)
					m.solutions[solutionLevel][route[lvl][ri]] = 1;
		}
	}
//ui
	el.board.textContent = '';
	for (let wi = 0; wi <= m.wordLen; wi++)
	{
		el.board.appendChild(el.beforeWords[wi]);
		el.board.appendChild(el.words[wi]);
		el.board.appendChild(el.afterWords[wi]);
		el.words[wi].textContent = '';
		el.words[wi].classList.remove("current", "noneditable");
		el.beforeWords[wi].classList.remove("current", "noneditable");
		el.afterWords[wi].classList.remove("current", "noneditable");
		for (let li = 0; li < m.wordLen; li++)
		{
			el.letters[wi][li].textContent = '';
			el.letters[wi][li].classList.remove("introduce", "required", "available", "hidden");
			el.words[wi].appendChild(el.letters[wi][li]);
		}
		el.a[wi].classList.add("hidden");
	}
	for (let wi = 0; wi <= m.wordLen; wi += m.wordLen)
	{
		el.words[wi].classList.add("noneditable");
		el.beforeWords[wi].classList.add("noneditable");
		el.afterWords[wi].classList.add("noneditable");
		for (let li = 0; li < m.wordLen; li++)
			el.letters[wi][li].textContent = words[wi][li];
		el.a[wi].classList.remove("hidden");
	}
	el.error.textContent = '';
	updateCurrent(el, words, m, maxWordLen );
}

function resetNextWordData(byteArray, m, abLen, dm, tr, el)
{
	el.error.textContent = tr[m.lang]['preping'];
	wait(1).then(() => {
		[m.sortedLetters[m.wordLen], m.minusLetterCombinations[m.wordLen], m.lookupTable[m.wordLen], m.anagrams[m.wordLen], m.directLinks[m.wordLen]] =
			prepareLookupTable(byteArray, m.wordLen, abLen, dm.dictStartPos[m.wordLen], dm.dictLen[m.wordLen]);
		m.nextWordList[m.wordLen] = new Array(dm.dictLen[m.wordLen]).fill(0);
	});
}

function prepareLookupTable(byteArray, wordLen, abLen, dictStartPos, dictLen)
{
	const counts = new Int8Array(abLen);
	const sortedLetters = new Uint8Array(wordLen * dictLen);
	const minusLetterCombinations = new Int8Array(wordLen * wordLen * dictLen).fill(-1);
	const directLinks = new Int32Array(wordLen * dictLen).fill(-1);
	const anagramPos = new Uint16Array(dictLen);
	const anagramSize = -2025 * wordLen ** 2 + 26345 * wordLen - 70252;
	let anagramWI = new Int32Array(anagramSize);
	let anagramNext = new Uint16Array(anagramSize);
	let anagramCount = 1; //0 is used for "there is no anagram"

	function addAnagram(iOriginal, iWord)
	{
		let nextAnagramPos = anagramPos[iOriginal];
		let prevAnagramPos;
		let seen = 1;
		if (nextAnagramPos === 0)
		{
			anagramPos[iOriginal] = anagramCount;
			seen = 0;
		}
		else
		{
			do
			{
				if (anagramWI[nextAnagramPos] === iWord)
				{
					seen = 1;
					break;
				}
				prevAnagramPos = nextAnagramPos;
				nextAnagramPos = anagramNext[nextAnagramPos];
				seen = 0;
			} while (nextAnagramPos > 0)
			if (seen === 0)
				anagramNext[prevAnagramPos] = anagramCount;
		}
		if (seen === 0)
		{
			anagramWI[anagramCount] = iWord;
			if (anagramCount++ === anagramWI.length)
			{
				anagramWI = enlargeBuf(anagramWI);
				anagramNext = enlargeBuf(anagramNext);
			}
		}
	}

	//lookupTable needs 30MB+ of RAM! where a proper hash table would require ~3MB
	const lookupTable = [];
	const avl = [1, 20, 200, 1200, 6000, 24000, 72000, 180000, 20000];
	for (let i = 0; i <= wordLen; i++)
		lookupTable.push(new Int32Array(abLen * avl[i]).fill(-1));
	const tableCounter = new Array(wordLen).fill(-1);
	let slPos = 0;
	let bufferPos = dictStartPos;
	for (let wi = 0; wi < dictLen; wi++)
	{
	//sort letters of each word
		const startSLPos = slPos;
		for (let li = 0; li < wordLen; li++)
			counts[byteArray[bufferPos++]]++;
		for (let abi = 0; abi < abLen; abi++)
			while (counts[abi] > 0)
			{
				sortedLetters[slPos++] = abi;
				counts[abi]--;
			}
	//make combinations with one letter moved to the end
		let previousLetter = -1;
		let comb = 0;
		for (let li = 0; li < wordLen; li++)
		{
			const movedLetter = sortedLetters[startSLPos + li];
			if (movedLetter === previousLetter)
				continue;
			previousLetter = movedLetter;
			const mlvPos = (startSLPos + comb) * wordLen;
			for (let wli = 0; wli < li; wli++)
				minusLetterCombinations[mlvPos + wli] = sortedLetters[startSLPos + wli];
			for (let wli = li + 1; wli < wordLen; wli++)
				minusLetterCombinations[mlvPos + wli - 1] = sortedLetters[startSLPos + wli];
			minusLetterCombinations[mlvPos + wordLen - 1] = movedLetter;
			comb++;
	//insert combination into lookup table
			let pp = 0;
			for (let lvl = 0; lvl < wordLen - 1; lvl++)
			{
				const bytePos = pp * abLen + minusLetterCombinations[mlvPos + lvl];
				if (bytePos >= lookupTable[lvl].length)
					lookupTable[lvl] = enlargeBuf(lookupTable[lvl], -1);
				if (lookupTable[lvl][bytePos] === -1)
					lookupTable[lvl][bytePos] = ++tableCounter[lvl];
				pp = lookupTable[lvl][bytePos];
			}
			const lvl = wordLen - 1;
			const bytePos = pp * abLen + minusLetterCombinations[mlvPos + lvl];
			if (bytePos >= lookupTable[lvl].length)
				lookupTable[lvl] = enlargeBuf(lookupTable[lvl], -1);
			if (lookupTable[lvl][bytePos] === -1)
			{
				const pointer = ++tableCounter[lvl];
				lookupTable[lvl][bytePos] = pointer;
				if (pointer >= lookupTable[wordLen].length)
					lookupTable[wordLen] = enlargeBuf(lookupTable[wordLen], -1);
				lookupTable[wordLen][pointer] = wi;
			}
			else
				addAnagram(lookupTable[wordLen][lookupTable[lvl][bytePos]], wi);

			directLinks[wi * wordLen + comb - 1] = pp * abLen;
		}
	}
	return [sortedLetters, minusLetterCombinations, lookupTable, [anagramPos, anagramNext, anagramWI], directLinks];
}

function lookupKey(key, wordLen, abLen, m)
{
	let nextTable = 0;
	let ltPos;
	for (let lvl = 0; lvl < wordLen; lvl++)
	{
		ltPos = nextTable * abLen + key[lvl];
		nextTable = m.lookupTable[wordLen][lvl][ltPos]
		if (nextTable < 0)
			return undefined;
	}
	return m.lookupTable[wordLen][wordLen][nextTable];
}

function lookupChildrenWords(iWord, m, wordLen, abLen, wwo = [])
{
	const [withLetters, withoutLetters] = wwo;
	const children = [];
	const base = iWord * wordLen;
	for (let li = 0; li < wordLen; li++)
	{
		const mlcPos = (base + li) * wordLen;
		if (m.minusLetterCombinations[wordLen][mlcPos] < 0)
			break;
		const ltPos = m.directLinks[wordLen][base + li];
		for (let abi = 0; abi < abLen; abi++)
		{
			const lastTableIndex = m.lookupTable[wordLen][wordLen - 1][ltPos + abi];
			if (lastTableIndex < 0)
				continue;
			const foundWordIndex = m.lookupTable[wordLen][wordLen][lastTableIndex];
			if (foundWordIndex !== iWord)
			{
				if (wwo.length > 0)
				{
					if (withLetters.indexOf(abi) >= 0
					 &&	withoutLetters.indexOf(m.minusLetterCombinations[wordLen][mlcPos + wordLen - 1]) < 0) //this could go @start of first loop
						children.push([abi, foundWordIndex]);
				}
				else
					children.push(foundWordIndex);
			}
		}
	}
	return children;
}

function findDestinations(iWord, m, dictLen, wordLen, abLen, freqs)
{
	const freqWord = (wi, freqs) => freqs.getUint32((wi >> 5) * 4, false) & (1 << (wi % 32));
	const seenWords = new Int8Array(dictLen);
	const slWord = m.sortedLetters[wordLen].subarray(iWord * wordLen, iWord * wordLen + wordLen);
	let destinations = [iWord];
	for (let lvl = 0; lvl < wordLen; lvl++)
	{
		let newDestinations = [];
		for (let iStepWord of destinations)
		{
			//just in time calculation of nextWordList
			if (m.nextWordList[wordLen][iStepWord] === 0)
				m.nextWordList[wordLen][iStepWord] = lookupChildrenWords(iStepWord, m, wordLen, abLen);
			for (let iNextWord of m.nextWordList[wordLen][iStepWord])
			{
				if (seenWords[iNextWord] === 1)
					continue;
				seenWords[iNextWord] = 1;
				if (lvl === wordLen - 1)
				{
					const iNextWordPos = iNextWord * wordLen;
					if (slWord.some(common(m.sortedLetters[wordLen].subarray(iNextWordPos, iNextWordPos + wordLen))))
						continue;
				}
				else if (freqWord(iNextWord, freqs) === 0)
					continue;
				newDestinations.push(iNextWord);
			}
		}
		destinations = newDestinations;
	}
	return destinations;
}

function findRoutes(wordLen, abLen, m, from, to, distance)
{
	const wordParent = [new Int32Array(1)];
	const word = [new Int32Array(1)];
	const remainingL = [new Int8Array(1)];
	for (let lvl = 0; lvl < distance; lvl++)
	{
		const initialSize = 4 * 10 ** (lvl + 1);
		wordParent.push(new Int32Array(initialSize));
		word.push(new Int32Array(initialSize));
		remainingL.push(new Int8Array(initialSize));
	}

	const tocc = m.sortedLetters[wordLen].subarray(to * wordLen, (to + 1) * wordLen);
	const tocca = Array.from(tocc);
	const wordCount = [1];
	for (let i = 1; i < distance + 1; i++)
		wordCount[i] = 0;
	word[0][0] = from;
	remainingL[0][0] = (1 << wordLen) - 1;
	for (let level = 0; level < distance; level++)
	{
		const seen = {};
		const nextLevel = level + 1;
		for (let wci = 0; wci < wordCount[level]; wci++)
		{
			if (seen[word[level][wci]] !== undefined)
				continue;
			seen[word[level][wci]] = 1;
			const children = lookupChildrenWords(word[level][wci], m, wordLen, abLen, [tocca.filter((v, i) => remainingL[level][wci] & (1 << i)), tocc]);
			if (children.length === 0)
			{
				if (wordCount[nextLevel] === word[nextLevel].length)
				{
					word[nextLevel] = enlargeBuf(word[nextLevel]);
					wordParent[nextLevel] = enlargeBuf(wordParent[nextLevel]);
					remainingL[nextLevel] = enlargeBuf(remainingL[nextLevel]);
				}
				wordParent[nextLevel][wordCount[nextLevel]] = word[level][wci];
				word[nextLevel][wordCount[nextLevel]] = -1;
				wordCount[nextLevel]++;
			}
			else 
				for (let [addedL, nextWord] of children)
				{
					if (wordCount[nextLevel] === word[nextLevel].length)
					{
						word[nextLevel] = enlargeBuf(word[nextLevel]);
						wordParent[nextLevel] = enlargeBuf(wordParent[nextLevel]);
						remainingL[nextLevel] = enlargeBuf(remainingL[nextLevel]);
					}
					wordParent[nextLevel][wordCount[nextLevel]] = word[level][wci];
					word[nextLevel][wordCount[nextLevel]] = nextWord;
					const idx = tocca.findIndex((v, i) => v === addedL && remainingL[level][wci] & (1 << i));
					remainingL[nextLevel][wordCount[nextLevel]] = remainingL[level][wci] ^ (1 << idx);
					wordCount[nextLevel]++;
				}
		}
	}
	return [word, wordParent, wordCount];
}

function enlargeBuf(view, filler, multiplier = 1.3)
{
	const largerLength = Math.ceil(view.length * multiplier);
	const enlargedView = new (Object.getPrototypeOf(view)).constructor(largerLength);
	if (filler !== undefined)
		enlargedView.fill(filler);
	enlargedView.set(view);
	return enlargedView;
}

function findDataSizes(byteArray, dm, minWordLen, maxWordLen)
{
	const getSize = (array, pos) => (array[pos + 0] << 24) + (array[pos + 1] << 16) + (array[pos + 2] << 8) + (array[pos + 3]);
	dm.dictStartPos = new Array(maxWordLen);
	dm.dictLen = new Array(maxWordLen);
	dm.freqSet = new Array(maxWordLen);
	let pos = 0;
	for (let wl = minWordLen; wl < maxWordLen; wl++)
	{
		dm.dictStartPos[wl] = pos + 4;
		const size = getSize(byteArray, pos);
		dm.dictLen[wl] = size;
		pos += size * wl + 4;
		const freqSize = (((size - 1) >> 5) + 1) * 4;
		dm.freqSet[wl] = new DataView(byteArray.slice(pos, pos + freqSize).buffer);
		pos += freqSize;
	}
}

window.addEventListener('load', function()
{
	const m = {};
	const dm = {};
	const lm = {};
	const tr = {};
	m.languages = ["en_US", "en_GB", "el"];
	lm["en_US"] = {
		"description":"american english",
		"alphabet":"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
		"link": "https://www.merriam-webster.com/dictionary/%s",
		"linktext": "merriam-webster.com",
	};
	lm["en_GB"] = {
		"description":"british english",
		"alphabet":"ABCDEFGHIJKLMNOPQRSTUVWXYZ",
		"link": "https://www.oxfordlearnersdictionaries.com/definition/english/%s",
		"linktext": "oxfordlearnersdictionaries.com",
	};
	lm["el"]    = {
		"description":"ελληνικά",
		"alphabet":"ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ",
		"link": "https://www.greek-language.gr/greekLang/modern_greek/tools/lexica/triantafyllides/search.html?lq=%s&loptall=true&dq=",
		"linktext": "greek-language.gr",
	};
	tr["en_US"] = {
		"notword": "This is NOT a word",
		"deadend": "This is a word,\nbut a known DEAD-END",
		"anagram": "This is not a word\nBut, there is a word that is an anagram of these letters",
		"notanag": "This is not a word\nAnd there is no word that is an anagram of these letters",
		"loading": "Downloading dictionary\nPlease wait",
		"preping": "Preparing dictionary\nPlease wait",
		"help": [
			"Switch the letters of the initial word with the letters of the final word.",
			"Make a new word by switching one letter at each step.",
			"Each word has to be in the dictionary.",
			"Letters can shift position.",
			"Usually, there isn't only one solution.",
			"There is always a solution with only frequently used words.",
			"The first and last words do not follow the previous rule.",
			"Frequently used words do not contain names and abbreviations.",
			"Press ! to toggle easy mode.",
			"In easy mode(red), an incorrect input gives you a hint.",
		],
	};
	tr["en_GB"] = tr["en_US"];
	tr["el"] = {
		"notword": "ΔΕΝ υπάρχει τέτοια λέξη",
		"deadend": "Αυτή η λέξη υπάρχει,\nαλλά οδηγεί σε ΑΔΙΕΞΟΔΟ",
		"anagram": "Δεν υπάρχει τέτοια λέξη\nΑλλά υπάρχει λέξη με αναγραμματισμό αυτών των γραμμάτων",
		"notanag": "Δεν υπάρχει τέτοια λέξη\nΟύτε υπάρχει λέξη με αναγραμματισμό αυτών των γραμμάτων",
		"loading": "Το λεξικό φορτώνεται\nΠαρακαλώ περιμένετε",
		"preping": "Το λεξικό προετοιμάζεται\nΠαρακαλώ περιμένετε",
		"help": [
			"Ανταλλάξτε τα γράμματα της πρώτης λέξης με τα γράμματα της τελευταίας.",
			"Φτιάξτε μια νέα λέξη ανταλλάσωντας ένα γράμμα σε κάθε βήμα.",
			"Κάθε λέξη πρέπει να υπάρχει στο λεξικό.",
			"Τα γράμματα μπορεί να χρειαστεί να μετατοπιστούν σε άλλη θέση κάθε φορά.",
			"Συνήθως δεν υπάρχει μία λύση μόνο.",
			"Υπάρχει πάντα τουλάχιστον μία λύση με συχνά χρησιμοποιούμενες λέξεις.",
			"Η πρώτη και η τελευταία λέξη δεν υπάγονται στο προηγούμενο κανόνα.",
			"Οι συχνα χρησιμοποιούμενες λέξεις δεν περιλαμβάνουν ονόματα και συντομεύσεις.",
			"Πατήστε το ! αν δυσκολεύεστε.",
			"Όταν το ! είναι κόκκινο, μια λανθασμένη καταχώρηση μπορεί να υποδείξει τη λύση.",
		],
	};

	m.curLang = 0; //currently chosen item @ language change menu
	m.curLine = 0;
	m.LANG = 0;
	m.PLAY = 1;
	m.ABOUT = 2;
	const minWordLen = 4;
	const maxWordLen = 9; //not including
	m.addedLetters = [];
	m.removedLetters = [];
	m.availableLetters = [];
	m.requiredLetters = [];
	m.introduceLetters = [];

	const wordLenStr = localStorage.getItem("wordLen");
	m.wordLen = (wordLenStr === null) ? 5 : parseInt(wordLenStr);
	const easyModeStr = localStorage.getItem("easyMode");
	m.easyMode = (easyModeStr === null || easyModeStr !== "true") ? false : true;

	const words = [];
	const el = {};
	let byteArray;

	const oReq = new XMLHttpRequest();
	oReq.responseType = "arraybuffer";
	oReq.addEventListener("load", function ()
	{
		const arrayBuffer = oReq.response;
		if (arrayBuffer)
		{
			byteArray = new Uint8Array(arrayBuffer);
			findDataSizes(byteArray, dm, minWordLen, maxWordLen);
			wait(1).then(() => {
				resetNextWordData(byteArray, m, lm[m.lang].alphabet.length, dm, tr, el);
			}).then(() => {
				wait(1).then(() => {
					newGame(el, m, words, maxWordLen, lm, byteArray, dm.dictStartPos[m.wordLen], dm.dictLen[m.wordLen], dm.freqSet[m.wordLen]);
				})
			});
		}
	});
//construct ui
	let elem;
//language selector
	el.langmenu = document.createElement("div");
	for (let ldi = 0; ldi < m.languages.length; ldi++)
	{
		elem = document.createElement("div");
		elem.className = "lang";
		elem.tabIndex = 0;
		elem.textContent = lm[m.languages[ldi]].description;
		elem.lang = m.languages[ldi];
		elem.addEventListener("click", function(ev)
		{
			changeLangOrMode(ev.target.lang, m.lang, el, m, words, oReq, maxWordLen, tr);
		});
		el.langmenu.appendChild(elem);
	}
	el.langmenu.children[m.curLang].classList.add("current");

//splash screen
	el.splash = document.createElement("div");
	el.splash.className = "splash";
	el.info = document.createElement("div");
	el.info.className = "info";
	el.fork = document.createElement("a");
	el.fork.className = "external";
	el.fork.textContent = "Fork me on github";
	el.fork.href = "https://github.com/switchword/switchword.github.io.git";
	el.info.appendChild(el.fork);
	el.splash.appendChild(el.info);
	el.help = document.createElement("div");
	el.splash.appendChild(el.help);

//main ui
//header
	el.header = document.createElement("header");
	el.header.className = "header";
//esc
	el.esc = document.createElement("button");
	el.esc.className = "button esc";
	el.esc.textContent = "Esc";
	el.esc.addEventListener("click", function()
	{
		changeMode(m, el, m.LANG);
	});
	el.header.appendChild(el.esc);
//easy
	el.easy = document.createElement("button");
	el.easy.className = (m.easyMode == true) ? "button easy reallyeasy" : "button easy";
	el.easy.textContent = "!";
	el.easy.addEventListener("click", function()
	{
		changeEasy(m, el, words, lm, byteArray, dm.dictStartPos[m.wordLen], tr);
	});
	el.header.appendChild(el.easy);
//gamelen
	el.gamelen = [];
	for (let wl = minWordLen; wl < maxWordLen; wl++)
	{
		elem = document.createElement("button");
		elem.className = "button gamelen";
		elem.addEventListener("click", function(ev)
		{
			gamelenPressed(ev.target.textContent, el, m, words, maxWordLen, byteArray, lm, dm, tr);
		});
		elem.textContent = wl;
		el.gamelen.push(elem);
		el.header.appendChild(elem);
	}
//about
	el.about = document.createElement("button");
	el.about.className = "button about";
	el.about.textContent = "?";
	el.about.addEventListener("click", function()
	{
		changeMode(m, el, m.ABOUT);
	});
	el.header.appendChild(el.about);
//board
	el.board = document.createElement("div");
	el.board.className = "board";
//words
	el.words = [];
	el.beforeWords = [];
	el.afterWords = [];
	el.letters = [];
	el.a = [];
	function handleLetterClick(ev)
	{
		if (m.curLine === m.wordLen)
			newGame(el, m, words, maxWordLen, lm, byteArray, dm.dictStartPos[m.wordLen], dm.dictLen[m.wordLen], dm.freqSet[m.wordLen]);
		else
			letterPressed(ev.target.textContent, m, words, el, maxWordLen, lm, byteArray, dm.dictStartPos[m.wordLen], tr);
	}
	for (let wi = 0; wi < maxWordLen; wi++)
	{
		el.words.push(document.createElement("div"));
		el.words[wi].classList.add("word");
		el.beforeWords.push(document.createElement("div"));
		el.beforeWords[wi].classList.add("before");
		el.afterWords.push(document.createElement("div"));
		el.afterWords[wi].classList.add("after");
//letters
		el.letters.push([]);
		for (let li = 0; li < maxWordLen; li++)
		{
			el.letters[wi].push(document.createElement("span"));
			el.letters[wi][li].classList.add("letter");
			el.letters[wi][li].tabIndex=0;
			el.letters[wi][li].addEventListener("click", function(ev)
			{
				handleLetterClick(ev)
			});
			el.letters[wi][li].addEventListener("keydown", function(ev)
			{
				if (ev.key === " " || ev.key === "Enter")
					handleLetterClick(ev)
			});
		}
//links
		el.a.push(document.createElement("a"));
		el.a[wi].classList.add("external");
		el.a[wi].target = "_blank";
		el.beforeWords[wi].appendChild(el.a[wi]);
	}
//erasers
	el.backspace = document.createElement("span");
	el.backspace.innerHTML = "<b>&larr;</b>";
	el.backspace.className = "button backspace";
	el.backspace.tabIndex = 0;
	el.backspace.addEventListener("click", function()
	{
		backspacePressed(false, el, m, words, maxWordLen);
	});
	el.backspace.addEventListener("keydown", function(ev)
	{
		if (ev.key === " " || ev.key === "Enter")
			backspacePressed(false, el, m, words, maxWordLen);
	});
	el.clearline = document.createElement("span");
	el.clearline.innerHTML = "&cross;";
	el.clearline.className = "button clearline";
	el.clearline.tabIndex = 0;
	function clearLineClicked()
	{
		if (m.curLine < m.wordLen)
		{
			const cl = (m.curLine > 1 && words[m.curLine].length === 0) ? m.curLine - 1 : m.curLine;
			while (words[cl].length > 0)
				backspacePressed(false, el, m, words, maxWordLen);
		}
	}
	el.clearline.addEventListener("click", function()
	{
		clearLineClicked();
	});
	el.clearline.addEventListener("keydown", function(ev)
	{
		if (ev.key === " " || ev.key === "Enter")
			clearLineClicked();
	});
//error
	el.error = document.createElement("div");
	el.error.classList.add("error");

//initialize ui
	m.mode = m.PLAY;
	document.body.appendChild(el.header);
	document.body.appendChild(el.board);
	document.body.appendChild(el.error);

	m.lang = localStorage.getItem("lang");
	changeLangOrMode(m.lang, null, el, m, words, oReq, maxWordLen, tr);

//click anywhere to cancel modals
	window.addEventListener("click", function ()
	{
		if (m.mode === m.LANG)
		{
			if (m.lang !== null)
				changeMode(m, el, m.PLAY);
		}
		else if ( m.mode === m.ABOUT)
			changeMode(m, el, m.PLAY);
	}, true);

//keyboard events
	window.addEventListener("keydown", function (ev)
	{
		if (ev.defaultPrevented || ev.key === "Tab" || ev.ctrlKey || ev.altKey)
			return;
		if (m.mode === m.LANG)
		{
			if (ev.key === "ArrowUp")
			{
				if (m.curLang > 0)
					updateCurLang(m, el, m.curLang - 1);
			}
			else if (ev.key === "ArrowDown")
			{
				if (m.curLang < m.languages.length - 1)
					updateCurLang(m, el, m.curLang + 1);
			}
			else if (ev.key === " " || ev.key === "Enter")
			{
				if (document.activeElement !== undefined && document.activeElement != null && document.activeElement !== document.body)
					updateCurLang(m, el, m.languages.indexOf(document.activeElement.lang));
				changeLangOrMode(m.languages[m.curLang], m.lang, el, m, words, oReq, maxWordLen, tr);
			}
			else if (ev.key === "Escape")
			{
				if (m.lang !== null)
					changeMode(m, el, m.PLAY);
			}
		}
		else if (m.mode === m.PLAY)
		{
			const k = ev.key.toUpperCase();
			if (lm[m.lang].alphabet.indexOf(k) >= 0)
				letterPressed(k, m, words, el, maxWordLen, lm, byteArray, dm.dictStartPos[m.wordLen], tr);
			else if (ev.key >= "4" && ev.key < "9")
				gamelenPressed(ev.key, el, m, words, maxWordLen, byteArray, lm, dm, tr);
			else if (ev.key === "Backspace")
				backspacePressed(ev.repeat, el, m, words, maxWordLen);
			else if (ev.key === "Escape")
				changeMode(m, el, m.LANG);
			else if (ev.key === "?")
				changeMode(m, el, m.ABOUT);
			else if (ev.key === "!")
				changeEasy(m, el, words, lm, byteArray, dm.dictStartPos[m.wordLen], tr);
			else if (ev.key === " " || ev.key === "Enter")
			{
				if (m.curLine === m.wordLen)
					newGame(el, m, words, maxWordLen, lm, byteArray, dm.dictStartPos[m.wordLen], dm.dictLen[m.wordLen], dm.freqSet[m.wordLen]);
				else
					return;
			}
		}
		else if (m.mode === m.ABOUT)
		{
			if (ev.key === "Enter" || ev.key === "Escape" || ev.key === " " || ev.key === "?")
				changeMode(m, el, m.PLAY);
		}
		ev.preventDefault(); // Cancel the default action to avoid it being handled twice
	}, true); //dispatches the ev to the listener first, then to window

}, false);
