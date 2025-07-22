import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { UserService } from '../services/userService.js';

// UserService 인스턴스
const userService = new UserService();

/**
 * Passport.js GitHub OAuth 설정
 */
export function configurePassport() {
  // GitHub OAuth 전략 설정
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/auth/github/callback'
  }, async (accessToken: string, refreshToken: string, profile: any, done: any) => {
    try {
      console.log(`🔐 GitHub OAuth 콜백: ${profile.username} (${profile.id})`);
      
      // GitHub 프로필에서 사용자 정보 추출
      const githubProfile = {
        id: profile.id,
        username: profile.username || profile.login,
        displayName: profile.displayName || profile.name,
        email: profile.emails?.[0]?.value,
        avatar_url: profile.photos?.[0]?.value || profile._json?.avatar_url,
        html_url: profile.profileUrl || profile._json?.html_url
      };

      // 사용자 로그인 처리 (생성 또는 업데이트)
      const { user, isNewUser } = await userService.handleGithubLogin(githubProfile);

      if (isNewUser) {
        console.log(`✨ 새 사용자 GitHub OAuth 가입: ${user.githubUsername}`);
      } else {
        console.log(`🔄 기존 사용자 GitHub OAuth 로그인: ${user.githubUsername}`);
      }

      // OAuth에서 받은 액세스 토큰도 저장 (선택적)
      // 이는 GitHub API 호출에 사용할 수 있습니다
      (user as any).githubAccessToken = accessToken;

      return done(null, user);
    } catch (error) {
      console.error('❌ GitHub OAuth 처리 중 오류:', error);
      return done(error, null);
    }
  }));

  // 사용자 세션 직렬화
  passport.serializeUser((user: any, done) => {
    console.log(`📦 사용자 세션 직렬화: ${user.id}`);
    done(null, user.id);
  });

  // 사용자 세션 역직렬화
  passport.deserializeUser(async (userId: string, done) => {
    try {
      const user = await userService.getUserById(userId);
      if (user) {
        console.log(`📦 사용자 세션 역직렬화: ${user.githubUsername}`);
        done(null, user);
      } else {
        console.log(`⚠️ 세션에서 사용자를 찾을 수 없음: ${userId}`);
        done(new Error('사용자를 찾을 수 없습니다'), null);
      }
    } catch (error) {
      console.error('❌ 사용자 세션 역직렬화 오류:', error);
      done(error, null);
    }
  });

  console.log('🔧 Passport.js GitHub OAuth 설정 완료');
}

/**
 * GitHub OAuth 설정 검증
 */
export function validateGitHubOAuthConfig(): {
  isValid: boolean;
  missingEnvVars: string[];
} {
  const requiredVars = [
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GITHUB_CALLBACK_URL'
  ];

  const missingEnvVars = requiredVars.filter(varName => !process.env[varName]);
  const isValid = missingEnvVars.length === 0;

  if (isValid) {
    console.log('✅ GitHub OAuth 환경변수 설정 완료');
  } else {
    console.warn(`⚠️ 누락된 GitHub OAuth 환경변수: ${missingEnvVars.join(', ')}`);
  }

  return { isValid, missingEnvVars };
}

export default passport; 