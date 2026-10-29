# Translating the Prava question bank: Georgian → English

The app is a practice app for the Georgian driving theory exam. A learner will read your
English **instead of** the Georgian, sometimes switching mid-test. The previous app they used
had machine translations like "the driver, passengers and the infantry" (ქვეითი = pedestrian).
Your job is to make every question, answer and explanation read like it was written by a
careful native English speaker who knows Georgian traffic law.

## Input / output
- Input: `batches/bNN.json`. A list of entries (`question`, `sign` or `misc`).
- Every string to translate is an object `{"k": "s123", "ka": "<Georgian>"}`.
- Objects shaped `{"ctx": "<Georgian>"}` were already translated elsewhere. Read them for context only. Do NOT output them.
- `old_english_title_unreliable` on signs is an old, poor-quality translation. You can use it as a hint but write your own.
- `topic` is the Georgian topic name of the question, for context.
- Output: `out/bNN.json` with one flat object mapping every `k` in the batch to its English:
  `{"s123": "English text", "s124": "..."}`. UTF-8, valid JSON, no other keys.
- When done with a batch, run `python -I -X utf8 check.py NN` and fix everything it reports
  before moving on.

## Glossary
Use the terms in `C:\Users\l6myf\HEY\driving\non\Driving Test (EN)\02 Terminology.md` (Georgian
term in brackets after each English term). Read it before starting. The most important ones:

| Georgian | English |
|---|---|
| ქვეითი | pedestrian (NEVER "infantry") |
| სავალი ნაწილი | carriageway |
| მოძრაობის ზოლი | lane |
| გვერდულა | shoulder |
| გამყოფი ზოლი | dividing strip |
| გზაჯვარედინი | intersection |
| მიმდებარე ტერიტორია | adjacent territory |
| დასახლებული პუნქტი | built-up area (settlement) |
| მთავარი / მეორეხარისხოვანი გზა | main road / secondary road |
| ავტომაგისტრალი | motorway |
| საცხოვრებელი ზონა | residential zone |
| უპირატესობა | priority / right of way |
| გზის დათმობა / გზა დაუთმოს | give way |
| გასწრება | overtaking |
| შემხვედრის გვერდის აქცევა | passing oncoming traffic |
| მობრუნება | U-turn |
| მოხვევა | turn (left/right) |
| გაჩერება | stopping |
| დგომა | parking |
| იძულებითი გაჩერება | forced stop |
| არასაკმარისი / შეზღუდული ხილვადობა | insufficient / limited visibility |
| დღე-ღამის ბნელი დრო | dark time of day (or "at night" when natural) |
| მსუბუქი ავტომობილი | passenger car (or "car") |
| სატვირთო ავტომობილი | truck (lorry) |
| მისაბმელი / ნახევარმისაბმელი | trailer / semi-trailer |
| სამარშრუტო სატრანსპორტო საშუალება | route vehicle (bus, trolleybus, tram on a fixed route) |
| მექანიკური სატრანსპორტო საშუალება | motor vehicle |
| ნელმავალი | slow-moving vehicle |
| მარეგულირებელი | traffic officer |
| შუქნიშანი | traffic light(s) |
| საგზაო ნიშანი / მონიშვნა | road sign / road marking |
| ქვეითთა გადასასვლელი | pedestrian crossing |
| რკინიგზის გადასასვლელი | railway crossing |
| ტროტუარი | sidewalk |
| სანათი | light(s) / headlight(s) (pick by context) |
| ახლო / შორი განათება | dipped (low) beam / main (high) beam |
| საავარიო შუქსიგნალიზაცია | hazard warning lights |
| ავარიული გაჩერების ნიშანი | warning triangle |
| ბუქსირება | towing |
| ნებადართული მაქსიმალური მასა | maximum permitted mass |
| „საგზაო მოძრაობის შესახებ“ საქართველოს კანონი | the Law of Georgia on Road Traffic |
| კმ/სთ | km/h |

Keep each term consistent across the whole bank. If you meet an important recurring term not
listed here, add it to `glossary-extra.md` (Georgian | English | why) so the other translators
can see it, and read that file at the start of each batch.

## How to translate
1. **Meaning first.** Translate what the question is actually asking. Re-order the sentence if
   needed. Never translate word-for-word into broken English.
2. **Keep legal precision.** Explanations cite the law. Keep every number, paragraph, article,
   chapter and sign number exactly (e.g. "paragraph 3.21 of Chapter 3 of Annex 1"). Don't
   summarise or drop clauses; the reader may need them.
3. **Answers must stay distinguishable.** Options in one question often differ by a single word
   (left/right, may/must, only/also). Make sure that difference survives. Keep the options
   parallel in style. Never make a wrong answer sound right or vice versa.
4. **Fragments.** Many answers complete the question sentence ("Who must give way?" → "The
   driver of the passenger car"). Translate them as natural fragments that fit the English
   question.
5. **Sign references.** Write signs as `sign 3.20 "No overtaking"`. Use straight double quotes
   instead of „…“ / “…”.
6. **Source typos.** The Georgian sometimes has typos (e.g. ექსკალატორის "escalator" where it
   means ექსკავატორის "excavator"). Translate the intended meaning.
7. **Images.** Many questions refer to a picture ("in the picture", "vehicle number 2", "the
   red car"). Keep those references exactly ("the red car", "car No. 2", "the picture").
8. **Explanations** had a junk prefix ("Ticket explanation: ticket page") removed. Just
   translate the text you see.
9. Plain, clear English for a learner. British or American spelling is fine, but be consistent
   within a string. No notes, brackets or translator comments in the output.

## Self-review before saving each batch
Re-read every question with its answers in English only, as the learner would. Ask:
- Does the question make sense on its own?
- Is the correct answer still the right answer in English, and the wrong ones still wrong?
- Did any term drift from the glossary?
Fix anything that fails.
