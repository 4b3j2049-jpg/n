const firstShow = new Date(2026, 10, 7);
const today = new Date();
today.setHours(0, 0, 0, 0);

const daysUntilFirstShow = Math.round((firstShow - today) / 86400000);
const countdown = document.getElementById('countdown');

if (daysUntilFirstShow > 0) {
	countdown.textContent = `距離台北首場還有 ${daysUntilFirstShow} 天`;
} else if (daysUntilFirstShow === 0) {
	countdown.textContent = '今晚，台北見。';
} else {
	countdown.textContent = '2026《潮汐以外》巡演，與你相見。';
}

const playButton = document.getElementById('play-toggle');
const progress = document.getElementById('track-progress');
const elapsedTime = document.getElementById('elapsed-time');
const audioStatus = document.getElementById('audio-status');
const previewLength = 24;
const chordProgression = [
	[130.81, 164.81, 196, 246.94],
	[110, 130.81, 164.81, 196],
	[146.83, 174.61, 220, 261.63],
	[98, 123.47, 146.83, 196]
];
const melody = [523.25, 493.88, 440, 392, 440, 523.25, 587.33, 523.25];
let audioContext;
let previewBuffer;
let activeSource;
let playbackOffset = 0;
let playbackStartedAt = 0;
let isPlaying = false;
let animationFrame;

function createPreviewBuffer(context) {
	const sampleRate = context.sampleRate;
	const frameCount = Math.floor(sampleRate * previewLength);
	const buffer = context.createBuffer(2, frameCount, sampleRate);

	for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
		const samples = buffer.getChannelData(channel);

		for (let frame = 0; frame < frameCount; frame += 1) {
			const time = frame / sampleRate;
			const chord = chordProgression[Math.floor(time / 6) % chordProgression.length];
			const melodyBeat = time % 0.75;
			const melodyNote = melody[Math.floor(time / 0.75) % melody.length];
			const noteEnvelope = Math.min(1, melodyBeat / 0.025) * Math.exp(-melodyBeat * 4);
			const bassBeat = time % 1.5;
			const fade = Math.min(1, time, previewLength - time);
			let sample = 0;

			for (let voice = 0; voice < chord.length; voice += 1) {
				const phase = channel * 0.012 * (voice + 1);
				sample += Math.sin(2 * Math.PI * chord[voice] * time + phase) * (0.075 / (voice + 1));
			}

			sample += Math.sin(2 * Math.PI * melodyNote * time) * noteEnvelope * 0.12;
			sample += Math.sin(2 * Math.PI * 65.41 * time) * Math.exp(-bassBeat * 5) * 0.07;
			samples[frame] = sample * fade * 0.55;
		}
	}

	return buffer;
}

function formatTime(seconds) {
	const wholeSeconds = Math.floor(seconds);
	return `${Math.floor(wholeSeconds / 60)}:${String(wholeSeconds % 60).padStart(2, '0')}`;
}

function updateProgress() {
	if (!isPlaying) {
		return;
	}

	playbackOffset = Math.min(audioContext.currentTime - playbackStartedAt, previewLength);
	progress.value = playbackOffset;
	elapsedTime.textContent = formatTime(playbackOffset);
	animationFrame = requestAnimationFrame(updateProgress);
}

async function startPreview() {
	if (!audioContext) {
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) {
			audioStatus.textContent = '此瀏覽器目前不支援音訊播放。';
			return;
		}
		audioContext = new AudioContextClass();
		previewBuffer = createPreviewBuffer(audioContext);
	}

	await audioContext.resume();
	if (playbackOffset >= previewLength) {
		playbackOffset = 0;
	}

	const source = audioContext.createBufferSource();
	source.buffer = previewBuffer;
	source.connect(audioContext.destination);
	source.onended = () => {
		if (activeSource !== source || !isPlaying) {
			return;
		}
		isPlaying = false;
		playbackOffset = 0;
		progress.value = 0;
		elapsedTime.textContent = '0:00';
		playButton.textContent = '播放試聽';
		playButton.setAttribute('aria-label', '播放試聽');
		playButton.setAttribute('aria-pressed', 'false');
		audioStatus.textContent = '試聽結束，重新播放 24 秒原創合成片段。';
		cancelAnimationFrame(animationFrame);
	};
	activeSource = source;
	playbackStartedAt = audioContext.currentTime - playbackOffset;
	isPlaying = true;
	source.start(0, playbackOffset);
	playButton.textContent = '暫停播放';
	playButton.setAttribute('aria-label', '暫停播放');
	playButton.setAttribute('aria-pressed', 'true');
	audioStatus.textContent = '正在播放《潮汐以外》試聽片段。';
	updateProgress();
}

function pausePreview() {
	if (!isPlaying) {
		return;
	}

	playbackOffset = Math.min(audioContext.currentTime - playbackStartedAt, previewLength);
	isPlaying = false;
	cancelAnimationFrame(animationFrame);
	activeSource.onended = null;
	activeSource.stop();
	activeSource.disconnect();
	playButton.textContent = '繼續播放';
	playButton.setAttribute('aria-label', '繼續播放試聽');
	playButton.setAttribute('aria-pressed', 'false');
	audioStatus.textContent = '播放已暫停。';
}

playButton.addEventListener('click', () => {
	if (isPlaying) {
		pausePreview();
	} else {
		startPreview().catch(() => {
			audioStatus.textContent = '音訊無法啟動，請再試一次。';
		});
	}
});

progress.addEventListener('input', () => {
	if (!isPlaying) {
		playbackOffset = Number(progress.value);
		elapsedTime.textContent = formatTime(playbackOffset);
	}
});

progress.addEventListener('change', () => {
	const wasPlaying = isPlaying;
	if (wasPlaying) {
		pausePreview();
	}
	playbackOffset = Number(progress.value);
	elapsedTime.textContent = formatTime(playbackOffset);
	if (wasPlaying) {
		startPreview();
	}
});
