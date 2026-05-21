-- =============================================
-- place_bid RPC 함수
-- =============================================
create or replace function public.place_bid(
  p_auction_id bigint,
  p_user_id uuid,
  p_user_name text,
  p_amount integer
) returns json as $$
declare
  v_current_price integer;
  v_status text;
  v_ends_at timestamptz;
  v_bid_count integer;
begin
  -- 1. 경매 상태 확인
  select current_price, status, ends_at, bid_count
  into v_current_price, v_status, v_ends_at, v_bid_count
  from public.auctions
  where id = p_auction_id
  for update;

  if not found then
    return json_build_object('success', false, 'message', '경매를 찾을 수 없습니다.');
  end if;

  if v_status != 'live' then
    return json_build_object('success', false, 'message', '진행 중인 경매가 아닙니다.');
  end if;

  if v_ends_at < now() then
    return json_build_object('success', false, 'message', '이미 마감된 경매입니다.');
  end if;

  -- 2. 입찰가 확인
  if p_amount <= v_current_price then
    return json_build_object('success', false, 'message', '현재가보다 높은 금액을 입력해야 합니다.');
  end if;

  -- 3. 크레딧 확인 (선택 사항: 만약 입찰 시 크레딧을 묶어두고 싶다면 여기서 처리)
  -- 현재는 낙찰 시에만 차감하도록 되어 있으나, 입찰 시 잔액 확인은 필요할 수 있음.
  if exists (select 1 from public.credits where user_id = p_user_id and balance < p_amount) then
    return json_build_object('success', false, 'message', '크레딧 잔액이 부족합니다.');
  end if;

  -- 4. 입찰 내역 추가
  insert into public.bids (auction_id, bidder_id, bidder_name, amount)
  values (p_auction_id, p_user_id, p_user_name, p_amount);

  -- 4. 경매 정보 업데이트 (trigger가 이미 수행할 수도 있지만 RPC 내에서 명시적으로 처리 가능)
  -- schema.sql의 handle_new_bid 트리거가 이미 current_price와 bid_count를 업데이트함.

  return json_build_object('success', true, 'message', '입찰 완료!');
exception when others then
  return json_build_object('success', false, 'message', SQLERRM);
end;
$$ language plpgsql security definer;
