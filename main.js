document.addEventListener("DOMContentLoaded", function(event) { 
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const globalGain = audioCtx.createGain(); 
    globalGain.gain.setValueAtTime(1, audioCtx.currentTime)
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

    function keyDown(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && !activeOscillators[key]) {
            displayNoteOnScreen();
            playNote(key);
        }
    }

    function keyUp(event) {
        switch(synthesis) {
            case "am":
                keyUpAMSynthesis(event);
              break;
            case "fm":
                keyUpFMSynthesis(event);
              break;
            default:
                keyUpAdditiveSynthesis(event);
          }
    }

    function playNote(key) {
        console.log(synthesis);
        switch(synthesis) {
            case "am":
                playAMSynthesis(key);
              break;
            case "fm":
                playFMSynthesis(key);
              break;
            default:
                playAdditiveSynthesis(key);
          }
      }


      function playAdditiveSynthesis(key) {
        var oscillators = [];
        var gains = [];
        console.log(oscNum);
        for (var i = 1; i <= oscNum; i++) {
            var osc = audioCtx.createOscillator();
            const multiplier = i % 2 == 0 ? -15 : 15;
            osc.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
            osc.type = waveform;
            const gainNode = audioCtx.createGain();
            gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                
            osc.connect(gainNode);
            gainNode.connect(globalGain);
            oscillators.push(osc);
            gains.push(gainNode);

            osc.start();

            if (useLFO == "checked") {
                var lfo = audioCtx.createOscillator();
                lfo.frequency.value = 0.5;
                lfoGain = audioCtx.createGain();
                lfoGain.gain.value = 8;
                lfo.connect(lfoGain).connect(osc.frequency);
                lfo.start();
            }
    

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

        // Resets total gain if nothing is playing to avoid volume decrease
        if (Object.keys(activeOscillators).length == 0) {
            totalGain=0;
            globalGain.gain.setTargetAtTime(1, audioCtx.currentTime, 0.1);
        }
        }
    }


    function playAMSynthesis(key) {
        var carrier = audioCtx.createOscillator();
        var modulatorFreq = audioCtx.createOscillator();
        modulatorFreq.frequency.value = modulationFrequency;

        carrier.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
        carrier.type = waveform;
    
        const modulated = audioCtx.createGain();
        const depth = audioCtx.createGain();
        depth.gain.value = 0.5 //scale modulator output to [-0.5, 0.5]
        modulated.gain.value = 1.0 - depth.gain.value; //a fixed value of 0.5
    
        modulatorFreq.connect(depth).connect(modulated.gain); //.connect is additive, so with [-0.5,0.5] and 0.5, the modulated signal now has output gain at [0,1]
        carrier.connect(modulated)
        modulated.connect(globalGain);
        
        carrier.start();
        modulatorFreq.start();

        activeOscillators[key] = [carrier, modulatorFreq, depth, modulated]
        const depthValue = depth.gain.value;
        const modulatedValue = modulated.gain.value;

        totalGain += depthValue + modulatedValue;
        if (totalGain < 1) {
            globalGain.gain.setValueAtTime(1, audioCtx.currentTime);
        } else {
            globalGain.gain.setValueAtTime(1 / totalGain, audioCtx.currentTime);
    }
    }

    function keyUpAMSynthesis(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
            const carrier = activeOscillators[key][0];
            const modulatorFreq = activeOscillators[key][1];
            const depth = activeOscillators[key][2];
            const modulated = activeOscillators[key][3];
            delete activeOscillators[key];

            const depthValue = depth.gain.value;
            const modulatedValue = modulated.gain.value;
            totalGain -= depthValue + modulatedValue;
            if (totalGain < 1) {
                globalGain.gain.setValueAtTime(1, audioCtx.currentTime);
            } else {
                globalGain.gain.setValueAtTime(1 / totalGain, audioCtx.currentTime);
            }
            depth.gain.setTargetAtTime(0, audioCtx.currentTime + .2, 0.1);
            modulated.gain.setTargetAtTime(0, audioCtx.currentTime + .2, 0.1);
        }
    }

    function playFMSynthesis(key) {
        var carrier = audioCtx.createOscillator();
        var modulatorFreq = audioCtx.createOscillator();
        modulatorFreq.frequency.value = modulationFrequency;
        carrier.frequency.setValueAtTime(keyboardFrequencyMap[key], audioCtx.currentTime);
        carrier.type = waveform;

        const carrierGain = audioCtx.createGain(); // Create a gain node for carrier gain
        carrierGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    
        modulationIndex = audioCtx.createGain();
        modulationIndex.gain.setValueAtTime(100, audioCtx.currentTime);
    
        modulatorFreq.connect(modulationIndex);
        modulationIndex.connect(carrier.frequency);
    
        carrier.connect(carrierGain); // Connect carrier oscillator to carrier gain node
        carrierGain.connect(globalGain); // Connect carrier gain node to global gain
        carrier.start();
        modulatorFreq.start();
    
        activeOscillators[key] = [carrier, modulatorFreq, carrierGain, modulationIndex]

        totalGain += modulationIndex.gain.value;
        if (totalGain < 1) {
            globalGain.gain.setValueAtTime(1, audioCtx.currentTime);
        } else {
            globalGain.gain.setValueAtTime(1 / totalGain, audioCtx.currentTime);
    }
    }

    function keyUpFMSynthesis(event) {
        const key = (event.detail || event.which).toString();
        if (keyboardFrequencyMap[key] && activeOscillators[key]) {
            const carrier = activeOscillators[key][0];
            const modulatorFreq = activeOscillators[key][1];
            const carrierGain = activeOscillators[key][2];
            const modulationIndex = activeOscillators[key][3];
    
            delete activeOscillators[key];
            totalGain -= modulationIndex.gain.value + carrierGain.gain.value;
    
            if (totalGain < 1) {
                globalGain.gain.setValueAtTime(1, audioCtx.currentTime);
            } else {
                globalGain.gain.setValueAtTime(1 / totalGain, audioCtx.currentTime);
            }
    
            carrierGain.gain.setTargetAtTime(0, audioCtx.currentTime + .2, 0.1);
            modulationIndex.gain.setTargetAtTime(0, audioCtx.currentTime + .2, 0.1);
        }
    }


    async function playJingleBells() { 
        playNoteForOneSecond('67');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playNoteForOneSecond('67');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playNoteForOneSecond('67');
        await new Promise(resolve => setTimeout(resolve, 2000));
        playNoteForOneSecond('67');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playNoteForOneSecond('67');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playNoteForOneSecond('67');
        await new Promise(resolve => setTimeout(resolve, 2000));
        playNoteForOneSecond('67');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playNoteForOneSecond('84');
        await new Promise(resolve => setTimeout(resolve, 1000));
        playNoteForOneSecond('90');
        await new Promise(resolve => setTimeout(resolve, 1500));
        playNoteForOneSecond('88');
        await new Promise(resolve => setTimeout(resolve, 500));
        playNoteForOneSecond('67');
    }
    
    function playNoteForOneSecond(key) {
    keyDown({detail: key});
    setTimeout(() => {
    keyUp({detail: key});
    }, 500);
    }

    const jingleBellsButton = document.getElementById('jingleBellsButton');
    if (jingleBellsButton) {
        jingleBellsButton.addEventListener('click', playJingleBells);
    }

});



function updateCheckbox() {
    var checkbox = document.getElementById("lfoCheckbox");
    checkbox.value = checkbox.checked ? "checked" : "unchecked";
  }



  let modulationFrequency = 100;
  const modulationFreqOption = document.getElementById('modulationFreqOption');
  modulationFreqOption.addEventListener('change', function(event) {
    if (event.target.value > 0 && event.target.value < 400) {
        modulationFrequency = event.target.value;
    }
    });

    let oscNum = 5;
    const oscOption = document.getElementById('oscOption');
    oscOption.addEventListener('change', function(event) {
      if (event.target.value >= 1 && event.target.value < 11) {
        oscNum = event.target.value;
      }
      });

  let useLFO = false;
  const lfoOption = document.getElementById('lfoOption');
  lfoOption.addEventListener('change', function(event) {
      useLFO = event.target.value;
    });

  const waveformSelect = document.getElementById('waveform')
  let waveform = 'sine'
  waveformSelect.addEventListener('change', function(event) {
    waveform = event.target.value
  });

  const synthesisSelect = document.getElementById('synthesis')
  let synthesis = 'additive'
  synthesisSelect.addEventListener('change', function(event) {
    synthesis = event.target.value
    if (synthesisSelect.value === 'additive') {
      lfoOption.style.display = 'block';
      oscOption.style.display = 'block';
      modulationFreqOption.style.display ='none';
  } else {
      lfoOption.style.display = 'none';
      oscOption.style.display = 'none';
      modulationFreqOption.style.display ='block';
  }
  });


  function displayNoteOnScreen() {
    const noteContainer = document.getElementById('noteContainer');
    const noteElement = document.createElement('div');
    noteElement.classList.add('note');
    const noteImage = document.createElement('img');

    const seed = Math.random();
    if (seed > 0.66) {
        noteImage.src = 'note.png';
    } else if (seed > 0.33) {
        noteImage.src = 'note2.png';
    } else {
        noteImage.src = 'wholenote.png';
    }

    noteImage.style.width = '100%';
    noteImage.style.height = '100%';
    noteElement.appendChild(noteImage);
    noteElement.style.left = Math.random() * (window.innerWidth - 100) + 'px'; // Random left position
    noteElement.style.top = Math.random() * (window.innerHeight - 100) + 'px'; // Random top position
    noteContainer.appendChild(noteElement);
    setTimeout(() => {
        noteContainer.removeChild(noteElement);
    }, 1000);
}