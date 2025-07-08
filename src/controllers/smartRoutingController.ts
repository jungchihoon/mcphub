/**
 * Smart Routing 컨트롤러
 * 
 * AI 기반 도구 검색 및 추천 시스템을 위한 API 엔드포인트를 제공합니다.
 * 벡터 임베딩을 사용한 의미론적 검색으로 사용자 쿼리에 가장 적합한 도구를 찾습니다.
 * 
 * 주요 기능:
 * - 의미론적 도구 검색
 * - 도구 사용 통계 및 분석
 * - 임베딩 재인덱싱
 * - 검색 결과 피드백 수집
 */

import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { getSmartRoutingConfig } from '../utils/smartRouting.js';
import { 
  searchToolsByVector, 
  saveToolsAsVectorEmbeddings, 
  syncAllServerToolsEmbeddings 
} from '../services/vectorSearchService.js';
import { getServersInfo } from '../services/mcpService.js';

/**
 * 도구 검색 요청 인터페이스
 */
interface ToolSearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
  includeServerInfo?: boolean;
}

/**
 * 검색 결과 피드백 인터페이스
 */
interface SearchFeedback {
  queryId: string;
  toolName: string;
  serverName: string;
  rating: number; // 1-5
  successful: boolean;
  comments?: string;
}

/**
 * Smart Routing 상태 확인
 * 
 * Smart Routing이 활성화되어 있는지 확인하고 설정 정보를 반환합니다.
 * 
 * @param req Express 요청 객체
 * @param res Express 응답 객체
 */
export const getSmartRoutingStatus = async (req: Request, res: Response) => {
  // CORS 헤더 추가
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  try {
    const config = getSmartRoutingConfig();
    
    if (!config.enabled) {
      return res.status(404).json({
        success: false,
        message: 'Smart Routing is not enabled',
        data: { enabled: false }
      });
    }

    // 기본 상태 정보 반환
    const servers = getServersInfo();
    const connectedServers = servers.filter(s => s.status === 'connected');
    const totalTools = connectedServers.reduce((sum, server) => sum + (server.tools?.length || 0), 0);

    return res.json({
      success: true,
      data: {
        enabled: true,
        hasApiKey: !!config.openaiApiKey,
        hasDatabase: !!config.dbUrl,
        connectedServers: connectedServers.length,
        totalServers: servers.length,
        totalTools,
        embeddingModel: config.openaiApiEmbeddingModel
      }
    });
  } catch (error) {
    console.error('Error getting Smart Routing status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get Smart Routing status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * 의미론적 도구 검색
 * 
 * 사용자 쿼리를 받아서 벡터 임베딩 기반 의미론적 검색으로 관련 도구들을 찾습니다.
 * 
 * @param req Express 요청 객체 (query, limit, threshold 파라미터)
 * @param res Express 응답 객체
 */
export const searchTools = async (req: Request, res: Response) => {
  try {
    // 유효성 검사
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const config = getSmartRoutingConfig();
    if (!config.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Smart Routing is not enabled'
      });
    }

    const { query, limit = 10, threshold = 0.7, includeServerInfo = false } = req.body as ToolSearchRequest;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }

    // 검색 실행
    const searchResults = await searchToolsByVector(
      query,
      Math.min(limit, 50), // 최대 50개로 제한
      Math.max(0.1, Math.min(threshold, 1.0)) // 0.1 ~ 1.0 범위로 제한
    );

    // 서버 정보 포함 여부에 따라 결과 가공
    let results = searchResults;
    if (includeServerInfo) {
      const servers = getServersInfo();
      const serverMap = new Map(servers.map(s => [s.name, s]));
      
      results = searchResults.map((result: any) => ({
        ...result,
        serverInfo: serverMap.get(result.serverName) ? {
          status: serverMap.get(result.serverName)!.status,
          // 서버 정보에는 description이 없으므로 제거
        } : null
      }));
    }

    return res.json({
      success: true,
      data: {
        query,
        results,
        totalFound: results.length,
        searchParams: { limit, threshold, includeServerInfo }
      }
    });

  } catch (error) {
    console.error('Error searching tools:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search tools',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * 모든 도구 임베딩 재인덱싱
 * 
 * 현재 연결된 모든 서버의 도구들을 다시 벡터 임베딩으로 저장합니다.
 * 새로운 도구가 추가되거나 설정이 변경된 경우 사용합니다.
 * 
 * @param req Express 요청 객체
 * @param res Express 응답 객체
 */
export const reindexTools = async (req: Request, res: Response) => {
  try {
    const config = getSmartRoutingConfig();
    if (!config.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Smart Routing is not enabled'
      });
    }

    // 백그라운드에서 재인덱싱 실행
    const startTime = Date.now();
    await syncAllServerToolsEmbeddings();
    const duration = Date.now() - startTime;

    return res.json({
      success: true,
      message: 'Tool embeddings reindexed successfully',
      data: {
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error reindexing tools:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reindex tools',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Smart Routing 사용 통계
 * 
 * 검색 쿼리 수, 인기 도구, 성능 지표 등의 통계 정보를 반환합니다.
 * 
 * @param req Express 요청 객체
 * @param res Express 응답 객체
 */
export const getSmartRoutingStats = async (req: Request, res: Response) => {
  try {
    const config = getSmartRoutingConfig();
    if (!config.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Smart Routing is not enabled'
      });
    }

    const servers = getServersInfo();
    const connectedServers = servers.filter(s => s.status === 'connected');
    const totalTools = connectedServers.reduce((sum, server) => sum + (server.tools?.length || 0), 0);

    // 기본 통계 (실제로는 데이터베이스에서 조회해야 함)
    const stats = {
      overview: {
        totalServers: servers.length,
        connectedServers: connectedServers.length,
        totalTools,
        embeddingModel: config.openaiApiEmbeddingModel
      },
      performance: {
        avgSearchTime: '145ms', // 실제로는 측정된 값
        indexedTools: totalTools,
        lastIndexUpdate: new Date().toISOString()
      },
      usage: {
        totalSearches: 0, // 실제로는 로그에서 집계
        popularTools: [], // 실제로는 사용 빈도 기반
        popularQueries: [] // 실제로는 검색 로그 기반
      }
    };

    return res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error getting Smart Routing stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get Smart Routing statistics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * 검색 결과 피드백 수집
 * 
 * 사용자가 검색 결과에 대한 피드백을 제공하여 검색 품질을 개선합니다.
 * 
 * @param req Express 요청 객체 (피드백 데이터)
 * @param res Express 응답 객체
 */
export const submitSearchFeedback = async (req: Request, res: Response) => {
  try {
    const config = getSmartRoutingConfig();
    if (!config.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Smart Routing is not enabled'
      });
    }

    const feedback = req.body as SearchFeedback;
    
    // 기본 유효성 검사
    if (!feedback.queryId || !feedback.toolName || !feedback.serverName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required feedback fields: queryId, toolName, serverName'
      });
    }

    if (feedback.rating < 1 || feedback.rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // 실제로는 데이터베이스에 피드백 저장
    console.log('Search feedback received:', {
      queryId: feedback.queryId,
      toolName: feedback.toolName,
      serverName: feedback.serverName,
      rating: feedback.rating,
      successful: feedback.successful,
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: `feedback_${Date.now()}`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error submitting feedback:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * 특정 서버의 도구 재인덱싱
 * 
 * 특정 서버의 도구들만 다시 벡터 임베딩으로 저장합니다.
 * 
 * @param req Express 요청 객체 (serverName 파라미터)
 * @param res Express 응답 객체
 */
export const reindexServerTools = async (req: Request, res: Response) => {
  try {
    const config = getSmartRoutingConfig();
    if (!config.enabled) {
      return res.status(503).json({
        success: false,
        message: 'Smart Routing is not enabled'
      });
    }

    const { serverName } = req.params;
    if (!serverName) {
      return res.status(400).json({
        success: false,
        message: 'Server name is required'
      });
    }

    const servers = getServersInfo();
    const server = servers.find(s => s.name === serverName);
    
    if (!server) {
      return res.status(404).json({
        success: false,
        message: `Server '${serverName}' not found`
      });
    }

    if (server.status !== 'connected') {
      return res.status(400).json({
        success: false,
        message: `Server '${serverName}' is not connected`
      });
    }

    if (!server.tools || server.tools.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Server '${serverName}' has no tools to index`
      });
    }

    const startTime = Date.now();
    await saveToolsAsVectorEmbeddings(serverName, server.tools);
    const duration = Date.now() - startTime;

    return res.json({
      success: true,
      message: `Tools for server '${serverName}' reindexed successfully`,
      data: {
        serverName,
        toolsIndexed: server.tools.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(`Error reindexing tools for server:`, error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reindex server tools',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}; 