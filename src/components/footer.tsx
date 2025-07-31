import Link from "next/link";
import { 
  Mail, 
  Github, 
  Twitter, 
  MessageCircle,
  Shield,
  FileText,
  HelpCircle,
  Heart
} from "lucide-react";

const footerLinks = {
  product: [
    { name: "포트폴리오 관리", href: "/portfolio" },
    { name: "고배당 분석", href: "/analysis" },
    { name: "목표 계산기", href: "/calculator" },
    { name: "원금 회수 추적", href: "/recovery" },
  ],
  support: [
    { name: "도움말", href: "/help", icon: HelpCircle },
    { name: "문의하기", href: "/contact", icon: Mail },
    { name: "버그 신고", href: "/bug-report", icon: MessageCircle },
  ],
  legal: [
    { name: "개인정보처리방침", href: "/privacy", icon: Shield },
    { name: "이용약관", href: "/terms", icon: FileText },
    { name: "투자 유의사항", href: "/disclaimer", icon: FileText },
  ],
};

const socialLinks = [
  { name: "GitHub", href: "https://github.com", icon: Github },
  { name: "Twitter", href: "https://twitter.com", icon: Twitter },
  { name: "Email", href: "mailto:contact@example.com", icon: Mail },
];

export function Footer() {
  return (
    <footer className="bg-card border-t border-border mt-16">
      <div className="container mx-auto px-3 md:px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <h3 className="text-lg font-bold toss-text-gradient">
                배당투자 비서
              </h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              스마트한 배당 투자를 위한 올인원 플랫폼입니다. 
              포트폴리오 관리부터 고배당주 분석까지, 
              성공적인 배당 투자를 위한 모든 도구를 제공합니다.
            </p>
            
            {/* Social Links */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  className="w-9 h-9 rounded-lg bg-secondary/50 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="h-4 w-4" />
                </Link>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">주요 기능</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">고객 지원</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    <link.icon className="h-3 w-3" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">약관 및 정책</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                  >
                    <link.icon className="h-3 w-3" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>© 2024 배당투자 비서. Made with</span>
              <Heart className="h-3 w-3 text-red-500 fill-current" />
              <span>for investors</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <span className="mr-4">v1.0.0</span>
              <span>최종 업데이트: 2024년 1월</span>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-secondary/30 rounded-xl">
            <p className="text-xs text-muted-foreground leading-relaxed">
              ⚠️ <strong>투자 유의사항:</strong> 본 서비스에서 제공하는 정보는 투자 참고용으로만 활용해 주시기 바라며, 
              투자 결정에 대한 최종 책임은 투자자 본인에게 있습니다. 
              과거 수익률이 미래 수익률을 보장하지 않으며, 
              투자에는 손실 위험이 따를 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}