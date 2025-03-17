import { useEffect, useRef, useState } from 'react';

const DataFlowBackground = () => {
  const canvasRef = useRef(null);
  const [enabled, setEnabled] = useState(true);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // 设置Canvas尺寸为窗口大小
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    // 初始设置和窗口调整时更新canvas尺寸
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 鼠标位置跟踪
    let mouseX = undefined;
    let mouseY = undefined;
    let scrollSpeed = 0;
    let lastScrollY = window.scrollY;
    
    // 监听鼠标移动
    window.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    
    // 监听鼠标离开
    window.addEventListener('mouseout', function() {
      mouseX = undefined;
      mouseY = undefined;
    });
    
    // 监听滚动速度
    window.addEventListener('scroll', function() {
      scrollSpeed = Math.abs(window.scrollY - lastScrollY);
      lastScrollY = window.scrollY;
      // 滚动速度衰减
      setTimeout(() => {
        scrollSpeed *= 0.85;
      }, 50);
    });
    
    // 创建粒子类
    class Particle {
      constructor(layer) {
        this.reset();
        this.layer = layer; // 1, 2, 或 3，表示不同速度层
        this.speedFactor = layer === 1 ? 0.8 : layer === 2 ? 1 : 1.2;
        this.type = Math.random() > 0.5 ? 'binary' : 'json';
        this.text = this.type === 'binary' ? 
          (Math.random() > 0.5 ? '0' : '1') : 
          this.getRandomJSON();
        this.size = this.layer === 1 ? 14 : this.layer === 2 ? 12 : 10;
      }
      
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height - canvas.height;
        this.speed = 1 + Math.random() * 3;
        this.opacity = 0.1 + Math.random() * 0.7;
      }
      
      getRandomJSON() {
        const jsonSnippets = [
          '{', '}', '[]', '"key":', '"value"',
          'null', 'true', 'false', ':', ','
        ];
        return jsonSnippets[Math.floor(Math.random() * jsonSnippets.length)];
      }
      
      update() {
        // 基础移动
        this.y += this.speed * this.speedFactor * (1 + scrollSpeed / 50);
        
        // 光标交互
        if (mouseX && mouseY) {
          const dx = mouseX - this.x;
          const dy = mouseY - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < 150) {
            // 吸引力，形成动态隧道
            const angle = Math.atan2(dy, dx);
            const force = (150 - distance) / 150;
            
            this.x += Math.cos(angle) * force * 2;
            this.y += Math.sin(angle) * force * 2;
            this.opacity = Math.min(this.opacity + 0.02, 1);
          }
        }
        
        // 重置超出屏幕的粒子
        if (this.y > canvas.height) {
          this.reset();
        }
      }
      
      draw() {
        const gradient = ctx.createLinearGradient(this.x, this.y - 10, this.x, this.y + 10);
        gradient.addColorStop(0, `rgba(26, 28, 46, ${this.opacity})`); // 深空蓝
        gradient.addColorStop(1, `rgba(0, 255, 231, ${this.opacity})`); // 荧光青
        
        ctx.font = `${this.size}px monospace`;
        ctx.fillStyle = gradient;
        ctx.fillText(this.text, this.x, this.y);
        
        // 滚动时添加模糊效果
        if (scrollSpeed > 5) {
          ctx.shadowBlur = scrollSpeed / 2;
          ctx.shadowColor = 'rgba(0, 255, 231, 0.3)';
        } else {
          ctx.shadowBlur = 0;
        }
      }
    }
    
    // 创建粒子系统
    const particles = [];
    function createParticles() {
      // 减少粒子数量以提高性能 (原来是 100/150/100)
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle(1)); // 慢速层
      }
      for (let i = 0; i < 80; i++) {
        particles.push(new Particle(2)); // 中速层
      }
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle(3)); // 快速层
      }
    }
    
    // 动画循环
    function animate() {
      // 创建半透明背景，形成拖尾效果
      ctx.fillStyle = 'rgba(26, 28, 46, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // 更新和绘制所有粒子
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      
      requestAnimationFrame(animate);
    }
    
    // 启动动画
    createParticles();
    animate();
    
    // 清理事件监听器
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', function(e) {
        mouseX = e.clientX;
        mouseY = e.clientY;
      });
      window.removeEventListener('mouseout', function() {
        mouseX = undefined;
        mouseY = undefined;
      });
      window.removeEventListener('scroll', function() {
        scrollSpeed = Math.abs(window.scrollY - lastScrollY);
        lastScrollY = window.scrollY;
      });
    };
  }, []);

  return (
    <>
      {enabled && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -10,
          backgroundColor: '#1A1C2E'
        }}>
          <canvas ref={canvasRef} style={{
            display: 'block',
            width: '100%',
            height: '100%'
          }}></canvas>
        </div>
      )}
      <button 
        onClick={() => setEnabled(!enabled)}
        style={{
          position: 'fixed',
          bottom: '1rem',
          right: '1rem',
          zIndex: 50,
          backgroundColor: '#1A1C2E',
          color: '#00FFE7',
          padding: '0.5rem',
          borderRadius: '9999px',
          opacity: 0.7
        }}
        onMouseOver={(e) => e.currentTarget.style.opacity = 1}
        onMouseOut={(e) => e.currentTarget.style.opacity = 0.7}
      >
        {enabled ? '关闭' : '开启'}背景
      </button>
    </>
  );
};

export default DataFlowBackground; 