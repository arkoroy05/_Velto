import { RainbowButton } from "@/components/ui/rainbow-button"
import { StarBorder } from "@/components/ui/star-border"
import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1"
import { motion } from "motion/react"

export function RainbowButtonDemo() {
  return <RainbowButton>Get Unlimited Access</RainbowButton>;
}

export function StarBorderDemo() {
  return (
    <div className="space-y-8">
      <StarBorder>
        Theme-aware Border
      </StarBorder>
    </div>
  )
}

// Testimonials demo data and section
const testimonials = [
  {
    text:
      "This ERP revolutionized our operations, streamlining finance and inventory. The cloud-based platform keeps us productive, even remotely.",
    image:
      "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Briana Patton",
    role: "Operations Manager",
  },
  {
    text:
      "Implementing this ERP was smooth and quick. The customizable, user-friendly interface made team training effortless.",
    image:
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Bilal Ahmed",
    role: "IT Manager",
  },
  {
    text:
      "The support team is exceptional, guiding us through setup and providing ongoing assistance, ensuring our satisfaction.",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Saman Malik",
    role: "Customer Support Lead",
  },
  {
    text:
      "This ERP's seamless integration enhanced our business operations and efficiency. Highly recommend for its intuitive interface.",
    image:
      "https://images.unsplash.com/photo-1547425260-76bcadfb4f2e?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Omar Raza",
    role: "CEO",
  },
  {
    text:
      "Its robust features and quick support have transformed our workflow, making us significantly more efficient.",
    image:
      "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Zainab Hussain",
    role: "Project Manager",
  },
  {
    text:
      "The smooth implementation exceeded expectations. It streamlined processes, improving overall business performance.",
    image:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Aliza Khan",
    role: "Business Analyst",
  },
  {
    text:
      "Our business functions improved with a user-friendly design and positive customer feedback.",
    image:
      "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Farhan Siddiqui",
    role: "Marketing Director",
  },
  {
    text:
      "They delivered a solution that exceeded expectations, understanding our needs and enhancing our operations.",
    image:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Sana Sheikh",
    role: "Sales Manager",
  },
  {
    text:
      "Using this ERP, our online presence and conversions significantly improved, boosting business performance.",
    image:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=facearea&facepad=2&w=80&h=80&q=80",
    name: "Hassan Ali",
    role: "E-commerce Manager",
  },
]

const firstColumn = testimonials.slice(0, 3)
const secondColumn = testimonials.slice(3, 6)
const thirdColumn = testimonials.slice(6, 9)

export function Testimonials() {
  return (
    <section className="relative my-20 bg-[#0a0a0a] overflow-hidden">
      {/* Soft fades to blend with surrounding sections */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20" />
      <div className="container z-10 mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto"
        >
          <div className="flex justify-center">
            <div className="border py-1 px-4 rounded-lg">Testimonials</div>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold tracking-tighter mt-5">
            What our users say
          </h2>
          <p className="text-center mt-5 opacity-75">
            See what our customers have to say about us.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  )
}
