// 한글 자모/단어/낱말 비교 유틸
const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const JONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

export function decomposeHangul(syllable) {
  const uni = syllable.charCodeAt(0);
  if (uni < 0xAC00 || uni > 0xD7A3) return { cho: syllable, jung: "", jong: "" };
  const SIndex = uni - 0xAC00;
  const cho = CHO[Math.floor(SIndex / 588)];
  const jung = JUNG[Math.floor((SIndex % 588) / 28)];
  const jong = JONG[SIndex % 28];
  return { cho, jung, jong };
}

export function flattenHangul(text) {
  return text.split("").map(decomposeHangul).flatMap(c => [c.cho, c.jung, c.jong].filter(Boolean));
}

// Levenshtein 거리
export function levenshtein(a, b) {
  const dp = Array.from({length: a.length+1}, () => Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++) dp[i][0]=i;
  for(let j=0;j<=b.length;j++) dp[0][j]=j;
  for(let i=1;i<=a.length;i++){
    for(let j=1;j<=b.length;j++){
      if(a[i-1]===b[j-1]) dp[i][j]=dp[i-1][j-1];
      else dp[i][j]=1+Math.min(dp[i-1][j-1], dp[i][j-1], dp[i-1][j]);
    }
  }
  return dp[a.length][b.length];
}

export function judgePronunciation(userText, answer) {
  const uFlat = flattenHangul(userText.replace(/\s/g,""));
  const aFlat = flattenHangul(answer.replace(/\s/g,""));
  const distance = levenshtein(uFlat, aFlat);
  const maxLen = Math.max(uFlat.length, aFlat.length);
  const score = 1 - distance / maxLen;
  return score >= 0.8; // 80% 이상이면 맞음
}
