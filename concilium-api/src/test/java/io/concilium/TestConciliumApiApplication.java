package io.concilium;

import org.springframework.boot.SpringApplication;

public class TestConciliumApiApplication {

	public static void main(String[] args) {
		SpringApplication.from(ConciliumApiApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
