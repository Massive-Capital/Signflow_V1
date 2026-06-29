UPDATE document_fields
SET profile_type = 'llc_corp_partnership_trust_solo_checkbook_ira'
WHERE profile_type IN ('llc', 'corp', 'partnership', 'trust', 'solo_401k', 'checkbook_ira');
