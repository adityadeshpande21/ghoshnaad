# Ghoshdand signals

## phases
- pre: Advance notice
- s: Notice
- do: Execute
- base: Position

## signals.daksh
- name: दक्ष — attention, with the staff
- does: The starting position for every signal.

## signals.vadananta
- name: वादनान्त — stop playing
- when: Execute: normally at the start of the charan’s last gan.
- does: Playing stops at the end of the charan; marching goes on.

## signals.nirdesh
- name: वाद्यनिर्देश — instrument
- steps.0.label: आनक (drum)
- steps.1.label: वंशी (flute)
- steps.2.label: शंख (bugle)
- steps.3.label: शृंग (horn)
- does: Advance notice only — which instrument plays next.

## signals.nirdeshVadananta
- name: वाद्यनिर्देश सहित वादनान्त — change instrument
- seq.0.label: Instrument (e.g. शंख)
- seq.1.label: Change hands
- seq.2.label: Stop: notice
- seq.3.label: Execute
- seq.4.label: Gap
- does: Then the रणन, and the announced rachana on the named instrument.

## signals.chal
- name: चल — march (प्रचल / मंदचल)
- steps.0.label: प्रचल
- steps.1.label: प्रचल
- steps.2.label: मंदचल
- steps.3.label: मंदचल
- when: Completed on a right foot: step off with the next left. On a left foot: skip one right, then the next left.
- does: The band moves off.

## signals.stambh
- name: स्तभ् — halt
- when: Then, in time, left foot forward and the right joins it.
- does: Marching stops; playing goes on.

## signals.vadanantaStambh
- name: वादनान्त सहित स्तभ् — stop and halt
- seq.0.label: Stop: notice
- seq.1.label: Straight to halt notice
- seq.2.label: Halt: execute
- when: From the stop notice go straight to the halt notice, without lowering the hand.
- does: Playing and marching stop together.

## signals.bhram
- name: भ्रम — wheel right / left / countermarch
- steps.0.label: दक्षिण (right)
- steps.1.label: वाम (left)
- steps.2.label: प्रति (countermarch)
- when: The turn starts with the प्रमुख; after the first two ranks have turned, the staff comes back.
- does: The band turns.

## signals.gatyantar
- name: गत्यंतर — change speed
- does: The speed of playing (and marching) changes.

## anim.vadananta
- 0.label: Stop playing, on the march
- 0.notes.1: Marching, playing
- 0.notes.2: पणव double stroke: look up
- 0.notes.3: Notice — hold at least 4 counts
- 0.notes.7: Execute — at the start of the last gan
- 0.notes.9: Charan ends: playing stops, marching goes on

## anim.nirdesh
- 0.label: All four instruments
- 0.notes.1: Marching
- 0.notes.2: आनक
- 0.notes.6: वंशी
- 0.notes.10: शंख
- 0.notes.14: शृंग
- 0.notes.18: दक्ष

## anim.nirdeshVadananta
- 0.label: 16 counts (शंख)
- 0.notes.1: 1–8: instrument (शंख) — advance notice
- 0.notes.9: 9–10: change hands
- 0.notes.11: 11–14: stop — notice
- 0.notes.15: 15: execute
- 0.notes.16: 16: gap
- 0.notes.17: Now the रणन, then the शंख rachana

## anim.chal
- 0.label: प्रचल from standing
- 0.notes.1: Standing, दक्ष
- 0.notes.2: Advance notice — at least 4 counts
- 0.notes.6: Execute on a right-foot count
- 0.notes.7: Step off with the next left foot
- 1.label: प्रचल to मंदचल
- 1.notes.1: Marching
- 1.notes.3: Notice
- 1.notes.7: Execute on the left foot
- 1.notes.8: Right, left — still at प्रचल speed
- 1.notes.10: Right foot at मंदचल speed

## anim.stambh
- 0.label: Halt from the march
- 0.notes.1: Marching, playing
- 0.notes.3: Notice
- 0.notes.8: Execute — as the right foot comes forward
- 0.notes.9: Left foot forward
- 0.notes.10: Right joins — halted
- 0.notes.11: Playing goes on

## anim.vadanantaStambh
- 0.label: Stop and halt together
- 0.notes.1: Marching, playing
- 0.notes.3: Stop — notice
- 0.notes.7: Straight to the halt notice
- 0.notes.8: Execute — right foot
- 0.notes.10: Playing and marching stop together

## anim.bhram
- 0.label: दक्षिण भ्रम
- 0.notes.1: Marching
- 0.notes.3: Notice — the turn starts with the प्रमुख
- 0.notes.9: The first two ranks have turned
- 0.notes.11: Staff back
- 1.label: वाम भ्रम
- 1.notes.1: Marching
- 1.notes.3: Notice
- 1.notes.9: The first two ranks have turned
- 1.notes.11: Staff back
- 2.label: प्रति भ्रम
- 2.notes.1: Marching
- 2.notes.6: The प्रमुख halts in दक्ष — that is the signal
- 2.notes.7: The band passes him and turns back

## anim.gatyantar
- 0.label: Speed change (e.g. 120 → 100)
- 0.notes.1: Marching at 120
- 0.notes.3: Advance notice
- 0.notes.7: Execute
- 0.notes.8: New speed: 100

## flags
- anak: Which side is the कलश? The book says the right hand grips “as in दक्ष”, so the कलश is on the प्रमुख’s right.
- shring: The book does not say whether the 45° slant runs forward-up or across the body.
- prachal1: “शेषपुच्छ towards the sky” is read as the staff upside down, कलश low near the hand.
- mandchal1: Read as the प्रचल 1 grip (staff upside down), arm and staff in one line.
- stambh2: कलश “at the same point”: it stays over the head while the hand comes to the chest.
- vamBhram: A mirror of दक्षिण भ्रम: staff in the left hand, right arm out.

## rules
- 0: Hold the staff still for at least 4 counts before the execute move.
- 1: A पणव double stroke (ध्वंकार-द्वय) calls the players to look up.
- 2: No execute move within one charan after a notice: the signal is cancelled.
- 3: Signals given with the left hand mean the same.
