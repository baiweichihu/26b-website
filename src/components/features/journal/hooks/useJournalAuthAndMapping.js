import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { logger } from '../../../../utils/logger';

export const useJournalAuthAndMapping = (baseUrl) => {
  const [authStatus, setAuthStatus] = useState('loading');
  const [pdfMapping, setPdfMapping] = useState({});

  const loadAuthStatus = useCallback(async (userOverride = null) => {
    try {
      let user = userOverride;
      if (!user) {
        const {
          data: { user: fetchedUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !fetchedUser) {
          setAuthStatus('anonymous');
          return;
        }
        user = fetchedUser;
      }

      if (!user) {
        setAuthStatus('anonymous');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setAuthStatus('anonymous');
        return;
      }

      setAuthStatus('member');
    } catch (error) {
      logger.error('Journal auth check failed:', error);
      setAuthStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    const loadMapping = async () => {
      try {
        const response = await fetch(`${baseUrl}journals/mapping.json`);
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        const mappingObj = {};

        if (data.sections && Array.isArray(data.sections)) {
          data.sections.forEach((item) => {
            const key = `${item.volume}-${item.sectionIndex}`;
            mappingObj[key] = { pdfPageStart: item.pdfPageStart };
          });
        }

        setPdfMapping(mappingObj);
      } catch (error) {
        logger.warn('加载 PDF 映射配置失败:', error);
      }
    };

    loadMapping();
  }, [baseUrl]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAuthStatus(session?.user ?? null);
    });

    return () => data?.subscription?.unsubscribe?.();
  }, [loadAuthStatus]);

  return {
    authStatus,
    pdfMapping,
  };
};

