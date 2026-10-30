-- Character classes are generated from the same Unicode categories as the TS parsers.
create function private.valid_game_identity_format(p_slug text,p_value text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(case when p_slug='overwatch' then value ~ '^[0-9A-Za-zª²-³µ¹-º¼-¾À-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮ̀-ʹͶ-ͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁ҃-ԯԱ-Ֆՙՠ-ֈ֑-ֽֿׁ-ׂׄ-ׇׅא-תׯ-ײؐ-ؚؠ-٩ٮ-ۓە-ۜ۟-۪ۨ-ۼۿܐ-݊ݍ-ޱ߀-ߵߺ߽ࠀ-࠭ࡀ-࡛ࡠ-ࡪࡰ-ࢇࢉ-࢏ࢗ-ࣣ࣡-ॣ०-९ॱ-ঃঅ-ঌএ-ঐও-নপ-রলশ-হ়-ৄে-ৈো-ৎৗড়-ঢ়য়-ৣ০-ৱ৴-৹ৼ৾ਁ-ਃਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹ਼ਾ-ੂੇ-ੈੋ-੍ੑਖ਼-ੜਫ਼੦-ੵઁ-ઃઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હ઼-ૅે-ૉો-્ૐૠ-ૣ૦-૯ૹ-૿ଁ-ଃଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହ଼-ୄେ-ୈୋ-୍୕-ୗଡ଼-ଢ଼ୟ-ୣ୦-୯ୱ-୷ஂ-ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹா-ூெ-ைொ-்ௐௗ௦-௲ఀ-ఌఎ-ఐఒ-నప-హ఼-ౄె-ైొ-్ౕ-ౖౘ-ౚ౜-ౝౠ-ౣ౦-౯౸-౾ಀ-ಃಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹ಼-ೄೆ-ೈೊ-್ೕ-ೖ೜-ೞೠ-ೣ೦-೯ೱ-ೳഀ-ഌഎ-ഐഒ-ൄെ-ൈൊ-ൎൔ-ൣ൦-൸ൺ-ൿඁ-ඃඅ-ඖක-නඳ-රලව-ෆ්ා-ුූෘ-ෟ෦-෯ෲ-ෳก-ฺเ-๎๐-๙ກ-ຂຄຆ-ຊຌ-ຣລວ-ຽເ-ໄໆ່-໎໐-໙ໜ-ໟༀ༘-༙༠-༳༹༵༷༾-ཇཉ-ཬཱ-྄྆-ྗྙ-ྼ࿆က-၉ၐ-ႝႠ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፝-፟፩-፼ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-᜕ᜟ-᜴ᝀ-ᝓᝠ-ᝬᝮ-ᝰᝲ-ᝳក-៓ៗៜ-៝០-៩៰-៹᠋-᠍᠏-᠙ᠠ-ᡸᢀ-ᢪᢰ-ᣵᤀ-ᤞᤠ-ᤫᤰ-᤻᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧚ᨀ-ᨛᨠ-ᩞ᩠-᩿᩼-᪉᪐-᪙ᪧ᪰-᫝᫠-᫫ᬀ-ᭌ᭐-᭙᭫-᭳ᮀ-᯳ᰀ-᰷᱀-᱉ᱍ-ᱽᲀ-ᲊᲐ-ᲺᲽ-Ჿ᳐-᳔᳒-ᳺᴀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ⁰-ⁱ⁴-⁹ⁿ-₉ₐ-ₜ⃐-⃰ℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎ⅐-↉①-⒛⓪-⓿❶-➓Ⰰ-ⳤⳫ-ⳳ⳽ⴀ-ⴥⴧⴭⴰ-ⵧⵯ⵿-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⷠ-ⷿⸯ々-〇〡-〯〱-〵〸-〼ぁ-ゖ゙-゚ゝ-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎ㆒-㆕ㆠ-ㆿㇰ-ㇿ㈠-㈩㉈-㉏㉑-㉟㊀-㊉㊱-㊿㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-꙲ꙴ-꙽ꙿ-꛱ꜗ-ꜟꜢ-ꞈꞋ-Ƛ꟱-ꠧ꠬꠰-꠵ꡀ-ꡳꢀ-ꣅ꣐-꣙꣠-ꣷꣻꣽ-꤭ꤰ-꥓ꥠ-ꥼꦀ-꧀ꧏ-꧙ꧠ-ꧾꨀ-ꨶꩀ-ꩍ꩐-꩙ꩠ-ꩶꩺ-ꫂꫛ-ꫝꫠ-ꫯꫲ-꫶ꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯪ꯬-꯭꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻ︀-️︠-︯ﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ𐀀-𐀋𐀍-𐀦𐀨-𐀺𐀼-𐀽𐀿-𐁍𐁐-𐁝𐂀-𐃺𐄇-𐄳𐅀-𐅸𐆊-𐆋𐇽𐊀-𐊜𐊠-𐋐𐋠-𐋻𐌀-𐌣𐌭-𐍊𐍐-𐍺𐎀-𐎝𐎠-𐏃𐏈-𐏏𐏑-𐏕𐐀-𐒝𐒠-𐒩𐒰-𐓓𐓘-𐓻𐔀-𐔧𐔰-𐕣𐕰-𐕺𐕼-𐖊𐖌-𐖒𐖔-𐖕𐖗-𐖡𐖣-𐖱𐖳-𐖹𐖻-𐖼𐗀-𐗳𐘀-𐜶𐝀-𐝕𐝠-𐝧𐞀-𐞅𐞇-𐞰𐞲-𐞺𐠀-𐠅𐠈𐠊-𐠵𐠷-𐠸𐠼𐠿-𐡕𐡘-𐡶𐡹-𐢞𐢧-𐢯𐣠-𐣲𐣴-𐣵𐣻-𐤛𐤠-𐤹𐥀-𐥙𐦀-𐦷𐦼-𐧏𐧒-𐨃𐨅-𐨆𐨌-𐨓𐨕-𐨗𐨙-𐨵𐨸-𐨿𐨺-𐩈𐩠-𐩾𐪀-𐪟𐫀-𐫇𐫉-𐫦𐫫-𐫯𐬀-𐬵𐭀-𐭕𐭘-𐭲𐭸-𐮑𐮩-𐮯𐰀-𐱈𐲀-𐲲𐳀-𐳲𐳺-𐴧𐴰-𐴹𐵀-𐵥𐵩-𐵭𐵯-𐶅𐹠-𐹾𐺀-𐺩𐺫-𐺬𐺰-𐺱𐻂-𐻇𐻺-𐼧𐼰-𐽔𐽰-𐾅𐾰-𐿋𐿠-𐿶𑀀-𑁆𑁒-𑁵𑁿-𑂺𑃂𑃐-𑃨𑃰-𑃹𑄀-𑄴𑄶-𑄿𑅄-𑅇𑅐-𑅳𑅶𑆀-𑇄𑇉-𑇌𑇎-𑇚𑇜𑇡-𑇴𑈀-𑈑𑈓-𑈷𑈾-𑉁𑊀-𑊆𑊈𑊊-𑊍𑊏-𑊝𑊟-𑊨𑊰-𑋪𑋰-𑋹𑌀-𑌃𑌅-𑌌𑌏-𑌐𑌓-𑌨𑌪-𑌰𑌲-𑌳𑌵-𑌹𑌻-𑍄𑍇-𑍈𑍋-𑍍𑍐𑍗𑍝-𑍣𑍦-𑍬𑍰-𑍴𑎀-𑎉𑎋𑎎𑎐-𑎵𑎷-𑏀𑏅𑏅𑎸-𑏊𑏌-𑏓𑏡-𑏢𑐀-𑑊𑑐-𑑙𑑞-𑑡𑒀-𑓅𑓇𑓐-𑓙𑖀-𑖵𑖸-𑗀𑗘-𑗝𑘀-𑙀𑙄𑙐-𑙙𑚀-𑚸𑛀-𑛉𑛐-𑛣𑜀-𑜚𑜝-𑜫𑜰-𑜻𑝀-𑝆𑠀-𑠺𑢠-𑣲𑣿-𑤆𑤉𑤌-𑤓𑤕-𑤖𑤘-𑤵𑤷-𑤸𑤻-𑥃𑥐-𑥙𑦠-𑦧𑦪-𑧗𑧚-𑧡𑧣-𑧤𑨀-𑨾𑩇𑩐-𑪙𑪝𑪰-𑫸𑭠-𑭧𑯀-𑯠𑯰-𑯹𑰀-𑰈𑰊-𑰶𑰸-𑱀𑱐-𑱬𑱲-𑲏𑲒-𑲧𑲩-𑲶𑴀-𑴆𑴈-𑴉𑴋-𑴶𑴺𑴼-𑴽𑴿-𑵇𑵐-𑵙𑵠-𑵥𑵧-𑵨𑵪-𑶎𑶐-𑶑𑶓-𑶘𑶠-𑶩𑶰-𑷛𑷠-𑷩𑻠-𑻶𑼀-𑼐𑼒-𑼺𑼾-𑽂𑽐-𑽚𑾰𑿀-𑿔𒀀-𒎙𒐀-𒑮𒒀-𒕃𒾐-𒿰𓀀-𓐯𓑀-𓑕𓑠-𔏺𔐀-𔙆𖄀-𖄹𖠀-𖨸𖩀-𖩞𖩠-𖩩𖩰-𖪾𖫀-𖫉𖫐-𖫭𖫰-𖫴𖬀-𖬶𖭀-𖭃𖭐-𖭙𖭛-𖭡𖭣-𖭷𖭽-𖮏𖵀-𖵬𖵰-𖵹𖹀-𖺖𖺠-𖺸𖺻-𖻓𖼀-𖽊𖽏-𖾇𖾏-𖾟𖿠-𖿡𖿣-𖿤𖿰-𖿶𗀀-𘳕𘳿-𘴞𘶀-𘷲𚿰-𚿳𚿵-𚿻𚿽-𚿾𛀀-𛄢𛄲𛅐-𛅒𛅕𛅤-𛅧𛅰-𛋻𛰀-𛱪𛱰-𛱼𛲀-𛲈𛲐-𛲙𛲝-𛲞𜳰-𜳹𜼀-𜼭𜼰-𜽆𝅥-𝅩𝅭-𝅲𝅻-𝆂𝆅-𝆋𝆪-𝆭𝉂-𝉄𝋀-𝋓𝋠-𝋳𝍠-𝍸𝐀-𝑔𝑖-𝒜𝒞-𝒟𝒢𝒥-𝒦𝒩-𝒬𝒮-𝒹𝒻𝒽-𝓃𝓅-𝔅𝔇-𝔊𝔍-𝔔𝔖-𝔜𝔞-𝔹𝔻-𝔾𝕀-𝕄𝕆𝕊-𝕐𝕒-𝚥𝚨-𝛀𝛂-𝛚𝛜-𝛺𝛼-𝜔𝜖-𝜴𝜶-𝝎𝝐-𝝮𝝰-𝞈𝞊-𝞨𝞪-𝟂𝟄-𝟋𝟎-𝟿𝨀-𝨶𝨻-𝩬𝩵𝪄𝪛-𝪟𝪡-𝪯𝼀-𝼞𝼥-𝼪𞀀-𞀆𞀈-𞀘𞀛-𞀡𞀣-𞀤𞀦-𞀪𞀰-𞁭𞂏𞄀-𞄬𞄰-𞄽𞅀-𞅉𞅎𞊐-𞊮𞋀-𞋹𞓐-𞓹𞗐-𞗺𞛀-𞛞𞛠-𞛵𞛾-𞛿𞟠-𞟦𞟨-𞟫𞟭-𞟮𞟰-𞟾𞠀-𞣄𞣇-𞣖𞤀-𞥋𞥐-𞥙𞱱-𞲫𞲭-𞲯𞲱-𞲴𞴁-𞴭𞴯-𞴽𞸀-𞸃𞸅-𞸟𞸡-𞸢𞸤𞸧𞸩-𞸲𞸴-𞸷𞸹𞸻𞹂𞹇𞹉𞹋𞹍-𞹏𞹑-𞹒𞹔𞹗𞹙𞹛𞹝𞹟𞹡-𞹢𞹤𞹧-𞹪𞹬-𞹲𞹴-𞹷𞹹-𞹼𞹾𞺀-𞺉𞺋-𞺛𞺡-𞺣𞺥-𞺩𞺫-𞺻🄀-🄌🯰-🯹𠀀-𪛟𪜀-𫠝𫠠-𬺭𬺰-𮯠𮯰-𮹝丽-𪘀𰀀-𱍊𱍐-𳑹󠄀-󠇯]{2,20}#[0-9]{4,10}$'
 when p_slug in ('valorant','lol') then cardinality(string_to_array(value,'#'))=2
   and (select sum(case when ascii(ch)>65535 then 2 else 1 end) from regexp_split_to_table(split_part(value,'#',1),'') ch) between 3 and 16
   and value !~ '[[:cntrl:]]' and split_part(value,'#',2) ~ '^[0-9A-Za-zª²-³µ¹-º¼-¾À-ÖØ-öø-ˁˆ-ˑˠ-ˤˬˮͰ-ʹͶ-ͷͺ-ͽͿΆΈ-ΊΌΎ-ΡΣ-ϵϷ-ҁҊ-ԯԱ-Ֆՙՠ-ֈא-תׯ-ײؠ-ي٠-٩ٮ-ٯٱ-ۓەۥ-ۦۮ-ۼۿܐܒ-ܯݍ-ޥޱ߀-ߪߴ-ߵߺࠀ-ࠕࠚࠤࠨࡀ-ࡘࡠ-ࡪࡰ-ࢇࢉ-࢏ࢠ-ࣉऄ-हऽॐक़-ॡ०-९ॱ-ঀঅ-ঌএ-ঐও-নপ-রলশ-হঽৎড়-ঢ়য়-ৡ০-ৱ৴-৹ৼਅ-ਊਏ-ਐਓ-ਨਪ-ਰਲ-ਲ਼ਵ-ਸ਼ਸ-ਹਖ਼-ੜਫ਼੦-੯ੲ-ੴઅ-ઍએ-ઑઓ-નપ-રલ-ળવ-હઽૐૠ-ૡ૦-૯ૹଅ-ଌଏ-ଐଓ-ନପ-ରଲ-ଳଵ-ହଽଡ଼-ଢ଼ୟ-ୡ୦-୯ୱ-୷ஃஅ-ஊஎ-ஐஒ-கங-சஜஞ-டண-தந-பம-ஹௐ௦-௲అ-ఌఎ-ఐఒ-నప-హఽౘ-ౚ౜-ౝౠ-ౡ౦-౯౸-౾ಀಅ-ಌಎ-ಐಒ-ನಪ-ಳವ-ಹಽ೜-ೞೠ-ೡ೦-೯ೱ-ೲഄ-ഌഎ-ഐഒ-ഺഽൎൔ-ൖ൘-ൡ൦-൸ൺ-ൿඅ-ඖක-නඳ-රලව-ෆ෦-෯ก-ะา-ำเ-ๆ๐-๙ກ-ຂຄຆ-ຊຌ-ຣລວ-ະາ-ຳຽເ-ໄໆ໐-໙ໜ-ໟༀ༠-༳ཀ-ཇཉ-ཬྈ-ྌက-ဪဿ-၉ၐ-ၕၚ-ၝၡၥ-ၦၮ-ၰၵ-ႁႎ႐-႙Ⴀ-ჅჇჍა-ჺჼ-ቈቊ-ቍቐ-ቖቘቚ-ቝበ-ኈኊ-ኍነ-ኰኲ-ኵኸ-ኾዀዂ-ዅወ-ዖዘ-ጐጒ-ጕጘ-ፚ፩-፼ᎀ-ᎏᎠ-Ᏽᏸ-ᏽᐁ-ᙬᙯ-ᙿᚁ-ᚚᚠ-ᛪᛮ-ᛸᜀ-ᜑᜟ-ᜱᝀ-ᝑᝠ-ᝬᝮ-ᝰក-ឳៗៜ០-៩៰-៹᠐-᠙ᠠ-ᡸᢀ-ᢄᢇ-ᢨᢪᢰ-ᣵᤀ-ᤞ᥆-ᥭᥰ-ᥴᦀ-ᦫᦰ-ᧉ᧐-᧚ᨀ-ᨖᨠ-ᩔ᪀-᪉᪐-᪙ᪧᬅ-ᬳᭅ-ᭌ᭐-᭙ᮃ-ᮠᮮ-ᯥᰀ-ᰣ᱀-᱉ᱍ-ᱽᲀ-ᲊᲐ-ᲺᲽ-Ჿᳩ-ᳬᳮ-ᳳᳵ-ᳶᳺᴀ-ᶿḀ-ἕἘ-Ἕἠ-ὅὈ-Ὅὐ-ὗὙὛὝὟ-ώᾀ-ᾴᾶ-ᾼιῂ-ῄῆ-ῌῐ-ΐῖ-Ίῠ-Ῥῲ-ῴῶ-ῼ⁰-ⁱ⁴-⁹ⁿ-₉ₐ-ₜℂℇℊ-ℓℕℙ-ℝℤΩℨK-ℭℯ-ℹℼ-ℿⅅ-ⅉⅎ⅐-↉①-⒛⓪-⓿❶-➓Ⰰ-ⳤⳫ-ⳮⳲ-ⳳ⳽ⴀ-ⴥⴧⴭⴰ-ⵧⵯⶀ-ⶖⶠ-ⶦⶨ-ⶮⶰ-ⶶⶸ-ⶾⷀ-ⷆⷈ-ⷎⷐ-ⷖⷘ-ⷞⸯ々-〇〡-〩〱-〵〸-〼ぁ-ゖゝ-ゟァ-ヺー-ヿㄅ-ㄯㄱ-ㆎ㆒-㆕ㆠ-ㆿㇰ-ㇿ㈠-㈩㉈-㉏㉑-㉟㊀-㊉㊱-㊿㐀-䶿一-ꒌꓐ-ꓽꔀ-ꘌꘐ-ꘫꙀ-ꙮꙿ-ꚝꚠ-ꛯꜗ-ꜟꜢ-ꞈꞋ-Ƛ꟱-ꠁꠃ-ꠅꠇ-ꠊꠌ-ꠢ꠰-꠵ꡀ-ꡳꢂ-ꢳ꣐-꣙ꣲ-ꣷꣻꣽ-ꣾ꤀-ꤥꤰ-ꥆꥠ-ꥼꦄ-ꦲꧏ-꧙ꧠ-ꧤꧦ-ꧾꨀ-ꨨꩀ-ꩂꩄ-ꩋ꩐-꩙ꩠ-ꩶꩺꩾ-ꪯꪱꪵ-ꪶꪹ-ꪽꫀꫂꫛ-ꫝꫠ-ꫪꫲ-ꫴꬁ-ꬆꬉ-ꬎꬑ-ꬖꬠ-ꬦꬨ-ꬮꬰ-ꭚꭜ-ꭩꭰ-ꯢ꯰-꯹가-힣ힰ-ퟆퟋ-ퟻ豈-舘並-龎ﬀ-ﬆﬓ-ﬗיִײַ-ﬨשׁ-זּטּ-לּמּנּ-סּףּ-פּצּ-ﮱﯓ-ﴽﵐ-ﶏﶒ-ﷇﷰ-ﷻﹰ-ﹴﹶ-ﻼ０-９Ａ-Ｚａ-ｚｦ-ﾾￂ-ￇￊ-ￏￒ-ￗￚ-ￜ𐀀-𐀋𐀍-𐀦𐀨-𐀺𐀼-𐀽𐀿-𐁍𐁐-𐁝𐂀-𐃺𐄇-𐄳𐅀-𐅸𐆊-𐆋𐊀-𐊜𐊠-𐋐𐋡-𐋻𐌀-𐌣𐌭-𐍊𐍐-𐍵𐎀-𐎝𐎠-𐏃𐏈-𐏏𐏑-𐏕𐐀-𐒝𐒠-𐒩𐒰-𐓓𐓘-𐓻𐔀-𐔧𐔰-𐕣𐕰-𐕺𐕼-𐖊𐖌-𐖒𐖔-𐖕𐖗-𐖡𐖣-𐖱𐖳-𐖹𐖻-𐖼𐗀-𐗳𐘀-𐜶𐝀-𐝕𐝠-𐝧𐞀-𐞅𐞇-𐞰𐞲-𐞺𐠀-𐠅𐠈𐠊-𐠵𐠷-𐠸𐠼𐠿-𐡕𐡘-𐡶𐡹-𐢞𐢧-𐢯𐣠-𐣲𐣴-𐣵𐣻-𐤛𐤠-𐤹𐥀-𐥙𐦀-𐦷𐦼-𐧏𐧒-𐨀𐨐-𐨓𐨕-𐨗𐨙-𐨵𐩀-𐩈𐩠-𐩾𐪀-𐪟𐫀-𐫇𐫉-𐫤𐫫-𐫯𐬀-𐬵𐭀-𐭕𐭘-𐭲𐭸-𐮑𐮩-𐮯𐰀-𐱈𐲀-𐲲𐳀-𐳲𐳺-𐴣𐴰-𐴹𐵀-𐵥𐵯-𐶅𐹠-𐹾𐺀-𐺩𐺰-𐺱𐻂-𐻇𐼀-𐼧𐼰-𐽅𐽑-𐽔𐽰-𐾁𐾰-𐿋𐿠-𐿶𑀃-𑀷𑁒-𑁯𑁱-𑁲𑁵𑂃-𑂯𑃐-𑃨𑃰-𑃹𑄃-𑄦𑄶-𑄿𑅄𑅇𑅐-𑅲𑅶𑆃-𑆲𑇁-𑇄𑇐-𑇚𑇜𑇡-𑇴𑈀-𑈑𑈓-𑈫𑈿-𑉀𑊀-𑊆𑊈𑊊-𑊍𑊏-𑊝𑊟-𑊨𑊰-𑋞𑋰-𑋹𑌅-𑌌𑌏-𑌐𑌓-𑌨𑌪-𑌰𑌲-𑌳𑌵-𑌹𑌽𑍐𑍝-𑍡𑎀-𑎉𑎋𑎎𑎐-𑎵𑎷𑏑𑏓𑐀-𑐴𑑇-𑑊𑑐-𑑙𑑟-𑑡𑒀-𑒯𑓄-𑓅𑓇𑓐-𑓙𑖀-𑖮𑗘-𑗛𑘀-𑘯𑙄𑙐-𑙙𑚀-𑚪𑚸𑛀-𑛉𑛐-𑛣𑜀-𑜚𑜰-𑜻𑝀-𑝆𑠀-𑠫𑢠-𑣲𑣿-𑤆𑤉𑤌-𑤓𑤕-𑤖𑤘-𑤯𑤿𑥁𑥐-𑥙𑦠-𑦧𑦪-𑧐𑧡𑧣𑨀𑨋-𑨲𑨺𑩐𑩜-𑪉𑪝𑪰-𑫸𑯀-𑯠𑯰-𑯹𑰀-𑰈𑰊-𑰮𑱀𑱐-𑱬𑱲-𑲏𑴀-𑴆𑴈-𑴉𑴋-𑴰𑵆𑵐-𑵙𑵠-𑵥𑵧-𑵨𑵪-𑶉𑶘𑶠-𑶩𑶰-𑷛𑷠-𑷩𑻠-𑻲𑼂𑼄-𑼐𑼒-𑼳𑽐-𑽙𑾰𑿀-𑿔𒀀-𒎙𒐀-𒑮𒒀-𒕃𒾐-𒿰𓀀-𓐯𓑁-𓑆𓑠-𔏺𔐀-𔙆𖄀-𖄝𖄰-𖄹𖠀-𖨸𖩀-𖩞𖩠-𖩩𖩰-𖪾𖫀-𖫉𖫐-𖫭𖬀-𖬯𖭀-𖭃𖭐-𖭙𖭛-𖭡𖭣-𖭷𖭽-𖮏𖵀-𖵬𖵰-𖵹𖹀-𖺖𖺠-𖺸𖺻-𖻓𖼀-𖽊𖽐𖾓-𖾟𖿠-𖿡𖿣𖿲-𖿶𗀀-𘳕𘳿-𘴞𘶀-𘷲𚿰-𚿳𚿵-𚿻𚿽-𚿾𛀀-𛄢𛄲𛅐-𛅒𛅕𛅤-𛅧𛅰-𛋻𛰀-𛱪𛱰-𛱼𛲀-𛲈𛲐-𛲙𜳰-𜳹𝋀-𝋓𝋠-𝋳𝍠-𝍸𝐀-𝑔𝑖-𝒜𝒞-𝒟𝒢𝒥-𝒦𝒩-𝒬𝒮-𝒹𝒻𝒽-𝓃𝓅-𝔅𝔇-𝔊𝔍-𝔔𝔖-𝔜𝔞-𝔹𝔻-𝔾𝕀-𝕄𝕆𝕊-𝕐𝕒-𝚥𝚨-𝛀𝛂-𝛚𝛜-𝛺𝛼-𝜔𝜖-𝜴𝜶-𝝎𝝐-𝝮𝝰-𝞈𝞊-𝞨𝞪-𝟂𝟄-𝟋𝟎-𝟿𝼀-𝼞𝼥-𝼪𞀰-𞁭𞄀-𞄬𞄷-𞄽𞅀-𞅉𞅎𞊐-𞊭𞋀-𞋫𞋰-𞋹𞓐-𞓫𞓰-𞓹𞗐-𞗭𞗰-𞗺𞛀-𞛞𞛠-𞛢𞛤-𞛥𞛧-𞛭𞛰-𞛴𞛾-𞛿𞟠-𞟦𞟨-𞟫𞟭-𞟮𞟰-𞟾𞠀-𞣄𞣇-𞣏𞤀-𞥃𞥋𞥐-𞥙𞱱-𞲫𞲭-𞲯𞲱-𞲴𞴁-𞴭𞴯-𞴽𞸀-𞸃𞸅-𞸟𞸡-𞸢𞸤𞸧𞸩-𞸲𞸴-𞸷𞸹𞸻𞹂𞹇𞹉𞹋𞹍-𞹏𞹑-𞹒𞹔𞹗𞹙𞹛𞹝𞹟𞹡-𞹢𞹤𞹧-𞹪𞹬-𞹲𞹴-𞹷𞹹-𞹼𞹾𞺀-𞺉𞺋-𞺛𞺡-𞺣𞺥-𞺩𞺫-𞺻🄀-🄌🯰-🯹𠀀-𪛟𪜀-𫠝𫠠-𬺭𬺰-𮯠𮯰-𮹝丽-𪘀𰀀-𱍊𱍐-𳑹]{3,5}$'
 else false end,false) from (select btrim(normalize(p_value,NFKC)) value) normalized;
$$;
revoke all on function private.valid_game_identity_format(text,text) from public,anon;
grant execute on function private.valid_game_identity_format(text,text) to authenticated;

create function private.check_alt_game_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare slug text;
begin
 select g.slug into slug from public.games g where g.id=new.game_id;
 new.alt_nick:=btrim(normalize(new.alt_nick,NFKC));
 if not private.valid_game_identity_format(slug,new.alt_nick) then
   raise exception '게임 ID 전체를 입력해 주십시오. 오버워치: Player#1234 / 발로란트: Player#KR1' using errcode='22023';
 end if;
 return new;
end;
$$;
revoke all on function private.check_alt_game_identity() from public,anon,authenticated;
create trigger check_alt_game_identity before insert or update of alt_nick,game_id on public.user_alt_accounts
for each row execute function private.check_alt_game_identity();

-- Existing invalid rows are preserved; every new ID write must pass validation.
drop policy user_alt_accounts_insert_own_verified_game on public.user_alt_accounts;
create policy user_alt_accounts_insert_own_registered_game on public.user_alt_accounts for insert to authenticated with check (
 (select auth.uid())=user_id and exists(select 1 from public.user_game_profiles gp join public.games g on g.id=gp.game_id
 where gp.user_id=user_alt_accounts.user_id and gp.game_id=user_alt_accounts.game_id
 and private.valid_game_identity_format(g.slug,case when g.slug='overwatch' then coalesce(nullif(gp.battle_tag,''),gp.game_uid) else gp.riot_id end))
);
drop policy user_alt_accounts_update_own on public.user_alt_accounts;
create policy user_alt_accounts_update_own on public.user_alt_accounts for update to authenticated
using ((select auth.uid())=user_id) with check (
 (select auth.uid())=user_id and exists(select 1 from public.user_game_profiles gp join public.games g on g.id=gp.game_id
 where gp.user_id=user_alt_accounts.user_id and gp.game_id=user_alt_accounts.game_id
 and private.valid_game_identity_format(g.slug,case when g.slug='overwatch' then coalesce(nullif(gp.battle_tag,''),gp.game_uid) else gp.riot_id end))
);

CREATE OR REPLACE FUNCTION private.save_my_game_identity(p_game_slug text, p_identity text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid(); gid uuid; tag text; riot text;
begin
  if actor is null then raise exception '로그인이 필요합니다.' using errcode='42501'; end if;
  select id into gid from public.games where slug=p_game_slug and is_active;
  if gid is null or p_game_slug not in ('overwatch','valorant') then
    raise exception '등록할 수 없는 게임입니다.' using errcode='22023';
  end if;
  p_identity:=btrim(normalize(p_identity,NFKC));
  if not private.valid_game_identity_format(p_game_slug,p_identity) then
    raise exception '게임 ID 전체를 입력해 주십시오.' using errcode='22023';
  end if;
  if p_game_slug='overwatch' then tag:=p_identity; else riot:=p_identity; end if;
  insert into public.user_game_profiles as gp(user_id,game_id,game_uid,battle_tag,riot_id,is_verified,verified_at)
  values(actor,gid,'manual:'||p_game_slug||':'||actor::text,tag,riot,false,null)
  on conflict(user_id,game_id) do update set
    battle_tag=excluded.battle_tag,riot_id=excluded.riot_id,
    is_verified=gp.is_verified and gp.battle_tag is not distinct from excluded.battle_tag and gp.riot_id is not distinct from excluded.riot_id,
    verified_at=case when gp.battle_tag is not distinct from excluded.battle_tag and gp.riot_id is not distinct from excluded.riot_id then gp.verified_at end,
    updated_at=now();
end;
$function$;
