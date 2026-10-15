do $$
declare d text;
begin
 d:=pg_get_functiondef('private.guard_clan_participant_roster()'::regprocedure);
 d:=replace(d,'참가자 명부가 변경되었습니다. 최신 명부를 확인하세요.',
 '현재 활동 중인 클랜원 또는 등록된 미가입 참가자만 출전할 수 있습니다. 최신 명부를 확인하세요.');
 execute d;
end $$;
