document.addEventListener("DOMContentLoaded", function(event) { 
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const globalGain = audioCtx.createGain(); 
    globalGain.gain.setValueAtTime(0.8, audioCtx.currentTime)
    globalGain.connect(audioCtx.destination);
    let totalGain = 0;

    const keyboardFrequencyMap = {
        '90': 261.625565300598634,  //Z - C
        '83': 277.182630976872096, //S - C#
        '88': 293.664767917407560,  //X - D
        '68': 311.126983722080910, //D - D#
        '67': 329.627556912869929,  //C - E
        '86': 349.228231433003884,  //V - F
        '71': 369.994422711634398, //G - F#
        '66': 391.995435981749294,  //B - Gb
        '72': 415.304697579945138, //H - G#
        '78': 440.000000000000000,  //N - A
        '74': 466.163761518089916, //J - A#
        '77': 493.883301256124111,  //M - Bm
        '81': 523.251130601197269,  //Q - C
        '50': 554.365261953744192, //2 - C#
        '87': 587.329535834815120,  //W - D
        '51': 622.253967444161821, //3 - D#
        '69': 659.255113825739859,  //E - E
        '82': 698.456462866007768,  //R - F
        '53': 739.988845423268797, //5 - F#c
        '84': 783.990871963498588,  //T - G
        '54': 830.609395159890277, //6 - G#
        '89': 880.000000000000000,  //Y - A
        '55': 932.327523036179832, //7 - A#
        '85': 987.766602512248223,  //U - B
    }

    window.addEventListener('keydown', keyDown, false);
    window.addEventListener('keyup', keyUp, false);

    activeOscillators = {}

    const waveformSelect = document.getElementById('waveform')
    let waveform = 'sine'
    waveformSelect.addEventListener('change', function(event) {
      waveform = event.target.value
    });

    const synthesisSelect = document.getElementById('synthesis')
    let synthesis = 'additive'
    waveformSelect.addEventListener('change', function(event) {
      waveform = event.target.value
    });

    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            playNote(key, "hi");
        }
    }

    function keyUp(event) {
        keyUpAdditiveSynthesis(event);
    }

    function playNote(key) {
        playAdditiveSynthesis(key);
        // const osc = audioCtx.createOscillator();
        // osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
        // osc.type = waveform;

        // const gainNode = audioCtx.createGain();
        // gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        // // gainNode.gain.exponentialRampToValueAtTime(1, audioCtx.currentTime + 0.2);
    
        // osc.connect(gainNode);
        // gainNode.connect(globalGain); 
        // osc.start();
        // activeOscillators[key] = [osc, gainNode]

        // const gainValue = gainNode.gain.value;
        // totalGain += gainValue;
        // if (totalGain < 1) {
        //     globalGain.gain.setValueAtTime(1, audioCtx.currentTime);
        // } else {
        //     globalGain.gain.setValueAtTime(1 / totalGain, audioCtx.currentTime);
        // }
      }


      function playAdditiveSynthesis(key) {
        // Create an array for the oscillators
        var oscillators = [];
        var gains = [];
        for (var i = 1; i <= 5; i++) {
            var osc = audioCtx.createOscillator();
            const multiplier = i < 3 ? -15 : 15;
            osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
            osc.type = waveform;
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                
            osc.connect(gainNode);
            gainNode.connect(globalGain);
            oscillators.push(osc);
            gains.push(gainNode);

            osc.start();
            activeOscillators[key] = [oscillators, gains]
            const gainValue = gainNode.gain.value;
            totalGain += gainValue;
            if (totalGain < 1) {
                globalGain.gain.setValueAtTime(1, audioCtx.currentTime);
            } else {
                globalGain.gain.setValueAtTime(1 / totalGain, audioCtx.currentTime);
            }
        }
    }

    function keyUpAdditiveSynthesis(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
            const oscillators = activeOscillators[key][0];
            const gains = activeOscillators[key][1];

        totalGain -= gains.reduce((acc, gainNode) => acc + gainNode.gain.value, 0);
        if (totalGain <= 1) {
            globalGain.gain.setValueAtTime(1, audioCtx.currentTime);
        } else {
            globalGain.gain.setValueAtTime(1 / Math.max(totalGain, 0.000001), audioCtx.currentTime);
        }

        oscillators.forEach(function(osc, index) {
            const gainNode = gains[index];
            gainNode.gain.setTargetAtTime(0, audioCtx.currentTime + .2, 0.1);
        });
        delete activeOscillators[key];
        }
    }


    // function initAMSynthesis() {
    //     var carrier = audioCtx.createOscillator();
    //     var modulatorFreq = audioCtx.createOscillator();
    //     modulatorFreq.frequency.value = 100;
    //     carrier.frequency.value = 440;
    
    //     const modulated = audioCtx.createGain();
    //     const depth = audioCtx.createGain();
    //     depth.gain.value = 0.5 //scale modulator output to [-0.5, 0.5]
    //     modulated.gain.value = 1.0 - depth.gain.value; //a fixed value of 0.5
    
    //     modulatorFreq.connect(depth).connect(modulated.gain); //.connect is additive, so with [-0.5,0.5] and 0.5, the modulated signal now has output gain at [0,1]
    //     carrier.connect(modulated)
    //     modulated.connect(audioCtx.destination);
        
    //     carrier.start();
    //     modulatorFreq.start();
    // }

      
    });