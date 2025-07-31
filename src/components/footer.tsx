import Link from "next/link";
import { 
  Mail, 
  Github, 
  Twitter
} from "lucide-react";

const footerLinks = {
  product: [
    { name: "배당주 랭킹", href: "/ranking" },
  ],
  support: [],
  legal: [],
};

const socialLinks = [
  { name: "GitHub", href: "https://github.com", icon: Github },
  { name: "Twitter", href: "https://twitter.com", icon: Twitter },
  { name: "Email", href: "mailto:contact@example.com", icon: Mail },
];

export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center">
                <span className="text-white dark:text-black font-bold text-sm">배</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                배당투자 비서
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
                  className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors duration-200"
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
            <h4 className="font-semibold text-gray-900 dark:text-white">주요 기능</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
              <span>© 2024 배당투자 비서</span>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="mr-4">v1.0.0</span>
              <span>최종 업데이트: 2024년 1월</span>
            </div>
          </div>
          
          {/* Disclaimer */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
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