async function init(){
  console.log('Init phase 1: Start');
  setStatus('connecting','서버와 통신하는 중...');
  try {
    if(typeof supabase === 'undefined') {
      console.error('Supabase SDK not found');
      throw new Error('데이터베이스 모듈 로드 실패 (네트워크 확인)');
    }
    
    console.log('Init phase 2: Create Client');
    sb = supabase.createClient(SB_URL, SB_KEY);
    
    console.log('Init phase 3: Fetch Data');
    const { data, error } = await sb.from('auctions').select('*').order('ends_at', { ascending: true });
    
    if(error) {
      console.error('Fetch error:', error);
      throw new Error('데이터를 가져오지 못했습니다: ' + error.message);
    }
    
    auctions = data || [];
    console.log('Init phase 4: Data loaded', auctions.length);
    
    document.getElementById('modeBadge').style.display = 'none';
    
    if(auctions.length === 0) {
      setStatus('ok', '✓ 연결됨 (진행 중인 경매 없음)');
    } else {
      setStatus('ok', '✓ 실시간 연결 성공');
    }
    
    subscribeRealtime();
    await checkOAuthReturn();
    updateTicker();
    
  } catch(e) {
    console.error('Final Init Error:', e);
    setStatus('err', e.message || '알 수 없는 연결 오류');
    auctions = [];
  } finally {
    populateArtist();
    renderGrid();
    updateHero();
    console.log('Init phase 5: UI Rendered');
  }
}
